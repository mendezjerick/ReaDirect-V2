import { FileTransfer } from "@capacitor/file-transfer";
import { Capacitor } from "@capacitor/core";
import { z } from "zod";

import { loadLearnerSession } from "../learner-auth/learnerApi";
import { apiUrl } from "../../lib/apiUrl";
import {
  OFFLINE_PRACTICE_LIMITS,
  OFFLINE_PRACTICE_MIME_TYPES,
  assetExtensionForMimeType,
  type OfflinePracticeMimeType,
} from "./offlinePracticeLimits";
import {
  isSafeRelativeApiPath,
  localAssetFileName,
} from "./offlinePracticePathSafety";
import {
  offlinePackListEntrySchema,
  offlinePackManifestSchema,
  type OfflinePackListEntry,
  type OfflinePackManifest,
  type OfflinePackRecord,
} from "./offlinePracticeSchemas";
import {
  OfflinePracticeRepository,
  type OfflinePracticeStagingInstall,
} from "./offlinePracticeRepository";

const packListResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    packs: z.array(offlinePackListEntrySchema),
  })
  .strict();

export class OfflinePracticeDownloadError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unauthorized"
      | "network"
      | "invalid_response"
      | "validation"
      | "storage",
  ) {
    super(message);
    this.name = "OfflinePracticeDownloadError";
  }
}

export interface OfflinePracticeDownloadOptions {
  readonly token?: string;
}

export interface OfflinePracticeBatchDownloadResult {
  readonly committed: OfflinePackRecord[];
  readonly failed: ReadonlyArray<{
    readonly entry: OfflinePackListEntry;
    readonly error: OfflinePracticeDownloadError;
  }>;
}

export class OfflinePracticeDownloadService {
  constructor(private readonly repository = new OfflinePracticeRepository()) {}

  async listAvailablePacks(
    options: OfflinePracticeDownloadOptions = {},
  ): Promise<OfflinePackListEntry[]> {
    const response = await this.authorizedRequest(
      "/api/learners/offline-practice/packs",
      options,
    );
    const bytes = await this.responseBytes(response, "application/json");
    try {
      return packListResponseSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes)),
      ).packs;
    } catch {
      throw new OfflinePracticeDownloadError(
        "The Offline Practice pack list is invalid.",
        "invalid_response",
      );
    }
  }

  async downloadPack(
    metadata: OfflinePackListEntry,
    options: OfflinePracticeDownloadOptions = {},
  ): Promise<OfflinePackRecord> {
    const entry = offlinePackListEntrySchema.parse(metadata);
    const manifestResponse = await this.authorizedRequest(
      entry.manifestPath,
      options,
    );
    const manifestBytes = await this.responseBytes(
      manifestResponse,
      OFFLINE_PRACTICE_MIME_TYPES.content[0],
    );
    const manifest = this.parseManifest(manifestBytes);
    this.assertListManifestMatch(entry, manifest);

    let staging: OfflinePracticeStagingInstall | null = null;
    try {
      staging = await this.repository.startStagingInstall(
        entry.packId,
        entry.version,
      );
      await this.repository.writeStagingBytes(
        staging,
        "manifest",
        manifestBytes,
      );

      await this.downloadResource(
        staging,
        "content",
        manifest.content.relativeApiPath,
        manifest.content.mimeType,
        options,
      );
      for (const asset of manifest.assets) {
        await this.downloadResource(
          staging,
          { assetId: asset.assetId, mimeType: asset.mimeType },
          asset.relativeApiPath,
          asset.mimeType,
          options,
        );
      }

      return await this.repository.commitStagingPack(staging);
    } catch (error) {
      if (staging) await this.repository.discardStaging(staging);
      if (error instanceof OfflinePracticeDownloadError) throw error;
      throw new OfflinePracticeDownloadError(
        "The Offline Practice pack could not be installed.",
        "validation",
      );
    }
  }

  /**
   * Download packs one at a time so each staging directory reaches COMMITTED
   * independently. A failed module is reported without invalidating the
   * modules that were already committed.
   */
  async downloadPacks(
    entries: readonly OfflinePackListEntry[],
    options: OfflinePracticeDownloadOptions = {},
  ): Promise<OfflinePracticeBatchDownloadResult> {
    const committed: OfflinePackRecord[] = [];
    const failed: Array<{
      entry: OfflinePackListEntry;
      error: OfflinePracticeDownloadError;
    }> = [];

    for (const entry of entries) {
      try {
        committed.push(await this.downloadPack(entry, options));
      } catch (error) {
        failed.push({
          entry,
          error:
            error instanceof OfflinePracticeDownloadError
              ? error
              : new OfflinePracticeDownloadError(
                  "The Offline Practice pack could not be installed.",
                  "validation",
                ),
        });
      }
    }

    return { committed, failed };
  }

  private async downloadResource(
    staging: OfflinePracticeStagingInstall,
    file: "content" | { assetId: string; mimeType: OfflinePracticeMimeType },
    relativeApiPath: string,
    mimeType: OfflinePracticeMimeType,
    options: OfflinePracticeDownloadOptions,
  ): Promise<void> {
    if (!isSafeRelativeApiPath(relativeApiPath)) {
      throw new OfflinePracticeDownloadError(
        "The Offline Practice download path is unsafe.",
        "validation",
      );
    }
    const url = apiUrl(relativeApiPath);
    const headers = await this.authorizationHeaders(options);

    if (Capacitor.isNativePlatform()) {
      // Prefer the WebView request path for bundled Capacitor apps. It keeps
      // the request on the same approved API origin as the rest of the app
      // and avoids platform-specific file-transfer failures with private app
      // storage. Keep FileTransfer as a fallback for larger/native-only
      // environments where WebView response buffering is unavailable.
      try {
        await this.downloadResourceWithFetch(staging, file, url, headers, mimeType);
        return;
      } catch (error) {
        if (error instanceof OfflinePracticeDownloadError && error.code !== "network") {
          throw error;
        }
      }

      const path = await this.repository.getStagingFileUri(staging, file);
      await FileTransfer.downloadFile({
        url,
        path,
        headers,
        connectTimeout: 15_000,
        readTimeout: 60_000,
        disableRedirects: true,
      });
      return;
    }

    await this.downloadResourceWithFetch(staging, file, url, headers, mimeType);
  }

  private async downloadResourceWithFetch(
    staging: OfflinePracticeStagingInstall,
    file: "content" | { assetId: string; mimeType: OfflinePracticeMimeType },
    url: string,
    headers: Record<string, string>,
    mimeType: OfflinePracticeMimeType,
  ): Promise<void> {
    const response = await this.request(url, headers);
    const bytes = await this.responseBytes(response, mimeType);
    await this.repository.writeStagingBytes(staging, file, bytes);
  }

  private async authorizedRequest(
    relativeApiPath: string,
    options: OfflinePracticeDownloadOptions,
  ): Promise<Response> {
    if (!isSafeRelativeApiPath(relativeApiPath)) {
      throw new OfflinePracticeDownloadError(
        "The Offline Practice request path is unsafe.",
        "validation",
      );
    }
    const headers = await this.authorizationHeaders(options);
    return this.request(apiUrl(relativeApiPath), headers);
  }

  private async request(
    url: string,
    headers: Record<string, string>,
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        redirect: "error",
      });
      if (response.status === 401 || response.status === 403) {
        throw new OfflinePracticeDownloadError(
          "Learner authentication is required to download Offline Practice.",
          "unauthorized",
        );
      }
      if (!response.ok) {
        throw new OfflinePracticeDownloadError(
          "The Offline Practice server could not provide that pack.",
          response.status >= 500 ? "network" : "invalid_response",
        );
      }
      return response;
    } catch (error) {
      if (error instanceof OfflinePracticeDownloadError) throw error;
      throw new OfflinePracticeDownloadError(
        "The Offline Practice download is unavailable.",
        "network",
      );
    }
  }

  private async responseBytes(
    response: Response,
    expectedMime: string,
  ): Promise<Uint8Array> {
    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim();
    if (contentType && contentType !== expectedMime) {
      throw new OfflinePracticeDownloadError(
        "The Offline Practice server returned an unexpected file type.",
        "validation",
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      bytes.length === 0 ||
      bytes.length > OFFLINE_PRACTICE_LIMITS.maxPackBytes
    ) {
      throw new OfflinePracticeDownloadError(
        "The Offline Practice response is too large.",
        "validation",
      );
    }
    return bytes;
  }

  private parseManifest(bytes: Uint8Array): OfflinePackManifest {
    try {
      return offlinePackManifestSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes)),
      );
    } catch {
      throw new OfflinePracticeDownloadError(
        "The Offline Practice manifest is invalid.",
        "validation",
      );
    }
  }

  private assertListManifestMatch(
    entry: OfflinePackListEntry,
    manifest: OfflinePackManifest,
  ): void {
    if (
      manifest.packId !== entry.packId ||
      manifest.version !== entry.version ||
      manifest.manifestSha256 !== entry.manifestSha256 ||
      manifest.totalBytes !== entry.totalBytes ||
      manifest.updatedAt !== entry.updatedAt
    ) {
      throw new OfflinePracticeDownloadError(
        "The Offline Practice manifest does not match the pack list.",
        "validation",
      );
    }
  }

  private async authorizationHeaders(
    options: OfflinePracticeDownloadOptions,
  ): Promise<Record<string, string>> {
    const token = options.token ?? loadLearnerSession()?.token;
    if (!token) {
      throw new OfflinePracticeDownloadError(
        "Learner authentication is required to download Offline Practice.",
        "unauthorized",
      );
    }
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }
}

export function offlineAssetDownloadFileName(
  assetId: string,
  mimeType: OfflinePracticeMimeType,
): string {
  return localAssetFileName(assetId, assetExtensionForMimeType(mimeType));
}
