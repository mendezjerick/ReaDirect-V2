import { Directory, Filesystem } from "@capacitor/filesystem";
import { z } from "zod";

import {
  OFFLINE_PRACTICE_LIMITS,
  OFFLINE_PRACTICE_MIME_TYPES,
  assetExtensionForMimeType,
  type OfflinePracticeMimeType,
} from "./offlinePracticeLimits";
import {
  isSafeLocalPathSegment,
  localAssetFileName,
} from "./offlinePracticePathSafety";
import {
  offlinePackRecordSchema,
  offlineContentDocumentSchema,
  offlinePackManifestSchema,
  offlinePracticeSessionSchema,
  parseOfflinePracticePack,
  type OfflineContentDocument,
  type OfflinePackManifest,
  type OfflinePackRecord,
  type OfflinePracticePack,
  type OfflinePracticeSession,
} from "./offlinePracticeSchemas";

const REPOSITORY_ROOT = "offline-practice";
const PACKS_ROOT = `${REPOSITORY_ROOT}/packs`;
const STAGING_ROOT = `${PACKS_ROOT}/.staging`;
const QUARANTINE_ROOT = `${PACKS_ROOT}/.quarantine`;
const PROFILES_ROOT = `${REPOSITORY_ROOT}/profiles`;
const INDEX_PATH = `${REPOSITORY_ROOT}/repository-v1.json`;
const INDEX_PARTIAL_PATH = `${INDEX_PATH}.partial`;
const COMMITTED_MARKER = "COMMITTED";
const MANIFEST_PATH = "manifest.json";
const CONTENT_PATH = "content.json";
const MANIFEST_PARTIAL_PATH = "manifest.json.partial";
const CONTENT_PARTIAL_PATH = "content.json.partial";

const safeIdSchema = z
  .string()
  .min(1)
  .max(OFFLINE_PRACTICE_LIMITS.maxIdLength)
  .refine(isSafeLocalPathSegment);

const repositoryReferenceSchema = z
  .object({ packId: safeIdSchema, version: safeIdSchema })
  .strict();

const repositoryIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    packs: z
      .array(offlinePackRecordSchema)
      .max(OFFLINE_PRACTICE_LIMITS.maxItemCount),
    activePacks: z
      .array(repositoryReferenceSchema)
      .max(OFFLINE_PRACTICE_LIMITS.maxModuleCount),
  })
  .strict()
  .superRefine((index, context) => {
    const recordKeys = new Set(
      index.packs.map((record) => `${record.packId}:${record.version}`),
    );
    const activeKeys = new Set<string>();

    for (const [indexPosition, reference] of index.activePacks.entries()) {
      const key = `${reference.packId}:${reference.version}`;
      if (!recordKeys.has(key) || activeKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["activePacks", indexPosition],
          message: "Active pack reference must point to one installed pack.",
        });
      }
      activeKeys.add(key);
    }
  });

const localProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    localProfileId: safeIdSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type OfflinePracticeRepositoryIndex = z.infer<
  typeof repositoryIndexSchema
>;

export interface OfflinePracticeStagingInstall {
  readonly downloadId: string;
  readonly packId: string;
  readonly version: string;
}

export interface OfflinePracticeLocalAsset {
  readonly assetId: string;
  readonly mimeType: OfflinePracticeMimeType;
  readonly uri: string;
}

export interface OfflinePracticeInstalledPack {
  readonly record: OfflinePackRecord;
  readonly pack: OfflinePracticePack;
}

export class OfflinePracticeRepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      "invalid_input" | "not_found" | "corrupt" | "storage" | "conflict",
  ) {
    super(message);
    this.name = "OfflinePracticeRepositoryError";
  }
}

export class OfflinePracticeRepository {
  private initialized = false;
  private operationQueue: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.withWriteLock(async () => {
      if (this.initialized) return;
      await this.ensureRepositoryDirectories();
      await this.cleanAbandonedStagingInternal();

      const index = await this.readIndex();
      if (!index || !(await this.indexPointsToValidPacks(index))) {
        await this.rebuildRepositoryIndexInternal();
      }
      this.initialized = true;
    });
  }

  async listCommittedPacks(): Promise<OfflinePackRecord[]> {
    await this.initialize();
    const index = await this.requireIndex();
    return index.packs.filter((record) => record.status === "committed");
  }

  async getActivePack(
    packId: string,
  ): Promise<OfflinePracticeInstalledPack | null> {
    this.assertSafeId(packId, "pack ID");
    await this.initialize();
    const index = await this.requireIndex();
    const reference = index.activePacks.find((item) => item.packId === packId);
    if (!reference) return null;

    const record = index.packs.find(
      (item) =>
        item.packId === reference.packId && item.version === reference.version,
    );
    if (!record || record.status !== "committed") return null;

    try {
      const pack = await this.validateCommittedDirectory(
        reference.packId,
        reference.version,
      );
      return { record, pack };
    } catch {
      await this.quarantinePack(reference.packId, reference.version);
      return null;
    }
  }

  async readManifest(
    packId: string,
    version?: string,
  ): Promise<OfflinePackManifest> {
    const installed = await this.requireInstalledPack(packId, version);
    return installed.pack.manifest;
  }

  async readContent(
    packId: string,
    version?: string,
  ): Promise<OfflineContentDocument> {
    const installed = await this.requireInstalledPack(packId, version);
    return installed.pack.content;
  }

  async resolveLocalAsset(
    packId: string,
    assetId: string,
    version?: string,
  ): Promise<OfflinePracticeLocalAsset> {
    this.assertSafeId(assetId, "asset ID");
    const installed = await this.requireInstalledPack(packId, version);
    const asset = installed.pack.manifest.assets.find(
      (item) => item.assetId === assetId,
    );
    if (!asset) {
      throw new OfflinePracticeRepositoryError(
        "Offline practice asset was not found.",
        "not_found",
      );
    }

    const path = this.assetPath(
      packId,
      installed.record.version,
      asset.assetId,
      asset.mimeType,
    );
    const uri = await Filesystem.getUri({ directory: Directory.Data, path });
    return { assetId, mimeType: asset.mimeType, uri: uri.uri };
  }

  async startStagingInstall(
    packId: string,
    version: string,
    downloadId = this.createDownloadId(),
  ): Promise<OfflinePracticeStagingInstall> {
    this.assertSafeId(packId, "pack ID");
    this.assertSafeId(version, "pack version");
    this.assertSafeId(downloadId, "download ID");
    await this.initialize();

    const stagingPath = this.stagingPath(downloadId);
    if (await this.pathExists(stagingPath)) {
      throw new OfflinePracticeRepositoryError(
        "The offline practice staging ID is already in use.",
        "conflict",
      );
    }
    await this.ensureDirectory(`${stagingPath}/assets`);
    return { downloadId, packId, version };
  }

  async getStagingFileUri(
    staging: OfflinePracticeStagingInstall,
    file:
      | "manifest"
      | "content"
      | { assetId: string; mimeType: OfflinePracticeMimeType },
  ): Promise<string> {
    this.assertStaging(staging);
    const path = this.stagingFilePath(staging.downloadId, file);
    const result = await Filesystem.getUri({ directory: Directory.Data, path });
    return result.uri;
  }

  async writeStagingBytes(
    staging: OfflinePracticeStagingInstall,
    file:
      | "manifest"
      | "content"
      | { assetId: string; mimeType: OfflinePracticeMimeType },
    bytes: Uint8Array,
  ): Promise<void> {
    this.assertStaging(staging);
    await this.writeBytes(
      this.stagingFilePath(staging.downloadId, file),
      bytes,
    );
  }

  async readStagingBytes(
    staging: OfflinePracticeStagingInstall,
    file:
      | "manifest"
      | "content"
      | { assetId: string; mimeType: OfflinePracticeMimeType },
  ): Promise<Uint8Array> {
    this.assertStaging(staging);
    return this.readBytes(this.stagingFilePath(staging.downloadId, file));
  }

  async commitStagingPack(
    staging: OfflinePracticeStagingInstall,
  ): Promise<OfflinePackRecord> {
    this.assertStaging(staging);
    await this.initialize();

    return this.withWriteLock(async () => {
      const manifestBytes = await this.readStagingBytes(staging, "manifest");
      const contentBytes = await this.readStagingBytes(staging, "content");
      const manifest = this.parseManifest(manifestBytes);
      if (
        manifest.packId !== staging.packId ||
        manifest.version !== staging.version
      ) {
        throw new OfflinePracticeRepositoryError(
          "The staged pack identity does not match its download request.",
          "corrupt",
        );
      }

      const content = this.parseContent(contentBytes);
      await this.validatePackBytes(
        staging,
        manifestBytes,
        contentBytes,
        manifest,
        content,
      );

      const finalPath = this.packPath(staging.packId, staging.version);
      if (await this.pathExists(finalPath)) {
        throw new OfflinePracticeRepositoryError(
          "The offline practice pack version is already installed.",
          "conflict",
        );
      }

      await Filesystem.rename({
        directory: Directory.Data,
        from: this.stagingFilePath(staging.downloadId, "manifest"),
        to: `${this.stagingPath(staging.downloadId)}/${MANIFEST_PATH}`,
      });
      await Filesystem.rename({
        directory: Directory.Data,
        from: this.stagingFilePath(staging.downloadId, "content"),
        to: `${this.stagingPath(staging.downloadId)}/${CONTENT_PATH}`,
      });
      await this.writeText(
        `${this.stagingPath(staging.downloadId)}/${COMMITTED_MARKER}`,
        COMMITTED_MARKER,
      );
      await this.ensureDirectory(`${PACKS_ROOT}/${staging.packId}`);
      await Filesystem.rename({
        directory: Directory.Data,
        from: this.stagingPath(staging.downloadId),
        to: finalPath,
      });

      const record = this.recordFromManifest(manifest);
      const index = await this.requireIndex();
      const packs = [
        ...index.packs.filter(
          (item) =>
            !(item.packId === record.packId && item.version === record.version),
        ),
        record,
      ];
      const nextIndex = {
        schemaVersion: 1 as const,
        packs,
        activePacks: [
          ...index.activePacks.filter((item) => item.packId !== record.packId),
          { packId: record.packId, version: record.version },
        ],
      } satisfies OfflinePracticeRepositoryIndex;
      try {
        await this.writeIndex(nextIndex);
      } catch {
        await this.quarantinePackWithoutIndex(record.packId, record.version);
        throw new OfflinePracticeRepositoryError(
          "The offline practice repository index could not be activated.",
          "storage",
        );
      }

      await Promise.allSettled(
        packs
          .filter(
            (item) =>
              item.packId === record.packId && item.version !== record.version,
          )
          .map((item) =>
            this.removePath(this.packPath(item.packId, item.version)),
          ),
      );
      return record;
    });
  }

  async discardStaging(staging: OfflinePracticeStagingInstall): Promise<void> {
    this.assertStaging(staging);
    await this.removePath(this.stagingPath(staging.downloadId));
  }

  async quarantinePack(packId: string, version: string): Promise<void> {
    this.assertSafeId(packId, "pack ID");
    this.assertSafeId(version, "pack version");
    await this.initialize();

    await this.withWriteLock(async () => {
      const source = this.packPath(packId, version);
      if (await this.pathExists(source)) {
        await this.ensureDirectory(QUARANTINE_ROOT);
        const target = `${QUARANTINE_ROOT}/${packId}-${version}-${Date.now()}`;
        await Filesystem.rename({
          directory: Directory.Data,
          from: source,
          to: target,
        });
      }
      const index = await this.readIndex();
      if (index) {
        await this.writeIndex({
          schemaVersion: 1,
          packs: index.packs.filter(
            (item) => !(item.packId === packId && item.version === version),
          ),
          activePacks: index.activePacks.filter(
            (item) => item.packId !== packId,
          ),
        });
      }
    });
  }

  async switchActiveVersion(packId: string, version: string): Promise<void> {
    this.assertSafeId(packId, "pack ID");
    this.assertSafeId(version, "pack version");
    await this.initialize();

    await this.withWriteLock(async () => {
      await this.validateCommittedDirectory(packId, version);
      const index = await this.requireIndex();
      const record = index.packs.find(
        (item) => item.packId === packId && item.version === version,
      );
      if (!record) {
        throw new OfflinePracticeRepositoryError(
          "The requested offline practice version is not installed.",
          "not_found",
        );
      }
      await this.writeIndex({
        ...index,
        activePacks: [
          ...index.activePacks.filter((item) => item.packId !== packId),
          { packId, version },
        ],
      });
    });
  }

  async deletePack(packId: string): Promise<void> {
    this.assertSafeId(packId, "pack ID");
    await this.initialize();
    await this.withWriteLock(async () => {
      const index = await this.requireIndex();
      const versions = index.packs.filter((item) => item.packId === packId);
      await Promise.all(
        versions.map((item) =>
          this.removePath(this.packPath(item.packId, item.version)),
        ),
      );
      await this.removePackSessions(packId);
      await this.writeIndex({
        schemaVersion: 1,
        packs: index.packs.filter((item) => item.packId !== packId),
        activePacks: index.activePacks.filter((item) => item.packId !== packId),
      });
    });
  }

  async deleteAll(): Promise<void> {
    await this.initialize();
    await this.withWriteLock(async () => {
      await this.removePath(REPOSITORY_ROOT);
      await this.ensureRepositoryDirectories();
      await this.writeIndex({ schemaVersion: 1, packs: [], activePacks: [] });
    });
  }

  async calculateApproximateStoredBytes(): Promise<number> {
    await this.initialize();
    return this.walkBytes(REPOSITORY_ROOT);
  }

  async cleanAbandonedStaging(): Promise<void> {
    await this.initialize();
    await this.withWriteLock(() => this.cleanAbandonedStagingInternal());
  }

  async rebuildRepositoryIndex(): Promise<OfflinePracticeRepositoryIndex> {
    await this.initialize();
    return this.withWriteLock(() => this.rebuildRepositoryIndexInternal());
  }

  async ensureLocalProfile(localProfileId: string): Promise<void> {
    this.assertSafeId(localProfileId, "local profile ID");
    await this.initialize();
    const path = `${PROFILES_ROOT}/${localProfileId}/profile.json`;
    if (await this.pathExists(path)) {
      localProfileSchema.parse(
        await this.parseJson(await this.readBytes(path)),
      );
      return;
    }
    const now = new Date().toISOString();
    await this.ensureDirectory(`${PROFILES_ROOT}/${localProfileId}/sessions`);
    await this.writeJson(path, {
      schemaVersion: 1,
      localProfileId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async deleteLocalProfile(localProfileId: string): Promise<void> {
    this.assertSafeId(localProfileId, "local profile ID");
    await this.initialize();
    await this.removePath(`${PROFILES_ROOT}/${localProfileId}`);
  }

  async readPracticeSession(
    localProfileId: string,
    packId: string,
    packVersion: string,
  ): Promise<OfflinePracticeSession | null> {
    this.assertSafeId(localProfileId, "local profile ID");
    this.assertSafeId(packId, "pack ID");
    this.assertSafeId(packVersion, "pack version");
    await this.ensureLocalProfile(localProfileId);

    const sessionsPath = `${PROFILES_ROOT}/${localProfileId}/sessions`;
    for (const filename of await this.directoryNames(sessionsPath)) {
      if (!filename.endsWith(".json")) continue;
      try {
        const session = offlinePracticeSessionSchema.parse(
          await this.parseJson(
            await this.readBytes(`${sessionsPath}/${filename}`),
          ),
        );
        if (
          session.packId === packId &&
          session.packVersion === packVersion &&
          session.localProfileId === localProfileId
        ) {
          return session;
        }
      } catch {
        // Ignore malformed local session files and keep the pack usable.
      }
    }
    return null;
  }

  async writePracticeSession(
    localProfileId: string,
    session: OfflinePracticeSession,
  ): Promise<void> {
    this.assertSafeId(localProfileId, "local profile ID");
    const parsed = offlinePracticeSessionSchema.parse(session);
    if (parsed.localProfileId !== localProfileId) {
      throw new OfflinePracticeRepositoryError(
        "Offline practice session profile does not match its storage namespace.",
        "invalid_input",
      );
    }
    await this.ensureLocalProfile(localProfileId);
    await this.writeJson(
      `${PROFILES_ROOT}/${localProfileId}/sessions/${parsed.localSessionId}.json`,
      parsed,
    );
  }

  private async requireInstalledPack(
    packId: string,
    version?: string,
  ): Promise<OfflinePracticeInstalledPack> {
    const installed = await this.getActivePack(packId);
    if (!installed || (version && installed.record.version !== version)) {
      throw new OfflinePracticeRepositoryError(
        "The offline practice pack is not active.",
        "not_found",
      );
    }
    return installed;
  }

  private async validateCommittedDirectory(
    packId: string,
    version: string,
  ): Promise<OfflinePracticePack> {
    const root = this.packPath(packId, version);
    if (!(await this.pathExists(`${root}/${COMMITTED_MARKER}`))) {
      throw new OfflinePracticeRepositoryError(
        "The offline practice commit marker is missing.",
        "corrupt",
      );
    }
    const manifestBytes = await this.readBytes(`${root}/${MANIFEST_PATH}`);
    const contentBytes = await this.readBytes(`${root}/${CONTENT_PATH}`);
    const manifest = this.parseManifest(manifestBytes);
    const content = this.parseContent(contentBytes);
    if (manifest.packId !== packId || manifest.version !== version) {
      throw new OfflinePracticeRepositoryError(
        "The committed pack identity is invalid.",
        "corrupt",
      );
    }
    return this.validatePackBytes(
      { downloadId: "committed", packId, version },
      manifestBytes,
      contentBytes,
      manifest,
      content,
      root,
    );
  }

  private async validatePackBytes(
    staging: OfflinePracticeStagingInstall,
    manifestBytes: Uint8Array,
    contentBytes: Uint8Array,
    manifest: OfflinePackManifest,
    content: OfflineContentDocument,
    root = this.stagingPath(staging.downloadId),
  ): Promise<OfflinePracticePack> {
    await this.validateManifestIntegrity(manifestBytes, manifest);
    await this.validateBytes(
      manifestBytes,
      "application/json",
      OFFLINE_PRACTICE_LIMITS.maxManifestBytes,
      manifestBytes.length,
      null,
      false,
    );
    await this.validateBytes(
      contentBytes,
      manifest.content.mimeType,
      OFFLINE_PRACTICE_LIMITS.maxContentBytes,
      manifest.content.byteCount,
      manifest.content.sha256,
      true,
    );

    let totalBytes = contentBytes.length;
    for (const asset of manifest.assets) {
      const path = `${root}/assets/${localAssetFileName(
        asset.assetId,
        assetExtensionForMimeType(asset.mimeType),
      )}`;
      const bytes = await this.readBytes(path);
      await this.validateBytes(
        bytes,
        asset.mimeType,
        OFFLINE_PRACTICE_LIMITS.maxSingleAssetBytes,
        asset.byteCount,
        asset.sha256,
        true,
      );
      totalBytes += bytes.length;
    }
    if (
      totalBytes !== manifest.totalBytes ||
      totalBytes > OFFLINE_PRACTICE_LIMITS.maxPackBytes
    ) {
      throw new OfflinePracticeRepositoryError(
        "The offline practice pack size is invalid.",
        "corrupt",
      );
    }
    return parseOfflinePracticePack({ manifest, content });
  }

  private parseManifest(bytes: Uint8Array): OfflinePackManifest {
    try {
      return offlinePackManifestSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes)),
      );
    } catch {
      throw new OfflinePracticeRepositoryError(
        "The offline practice manifest is invalid.",
        "corrupt",
      );
    }
  }

  private parseContent(bytes: Uint8Array): OfflineContentDocument {
    try {
      return offlineContentDocumentSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes)),
      );
    } catch {
      throw new OfflinePracticeRepositoryError(
        "The offline practice content is invalid.",
        "corrupt",
      );
    }
  }

  private async validateManifestIntegrity(
    bytes: Uint8Array,
    manifest: OfflinePackManifest,
  ): Promise<void> {
    const canonical = { ...manifest, manifestSha256: "" };
    const actual = await sha256Hex(
      new TextEncoder().encode(JSON.stringify(canonical)),
    );
    if (actual !== manifest.manifestSha256.toLowerCase()) {
      throw new OfflinePracticeRepositoryError(
        "Offline practice manifest SHA-256 validation failed.",
        "corrupt",
      );
    }
  }

  private async validateBytes(
    bytes: Uint8Array,
    mimeType: string,
    maxBytes: number,
    expectedByteCount: number,
    expectedSha256: string | null,
    verifyMime: boolean,
  ): Promise<void> {
    if (
      bytes.length === 0 ||
      bytes.length > maxBytes ||
      bytes.length !== expectedByteCount ||
      !this.allowedMime(mimeType) ||
      (verifyMime && !this.sniffsAs(bytes, mimeType))
    ) {
      throw new OfflinePracticeRepositoryError(
        "Offline practice file size or MIME validation failed.",
        "corrupt",
      );
    }
    if (expectedSha256 !== null) {
      const actual = await sha256Hex(bytes);
      if (actual !== expectedSha256.toLowerCase()) {
        throw new OfflinePracticeRepositoryError(
          "Offline practice SHA-256 validation failed.",
          "corrupt",
        );
      }
    }
  }

  private allowedMime(mimeType: string): mimeType is OfflinePracticeMimeType {
    return [
      ...OFFLINE_PRACTICE_MIME_TYPES.content,
      ...OFFLINE_PRACTICE_MIME_TYPES.image,
      ...OFFLINE_PRACTICE_MIME_TYPES.claraAudio,
    ].includes(mimeType as OfflinePracticeMimeType);
  }

  private sniffsAs(bytes: Uint8Array, mimeType: string): boolean {
    if (mimeType === "application/json") {
      try {
        JSON.parse(new TextDecoder().decode(bytes));
        return true;
      } catch {
        return false;
      }
    }
    if (mimeType === "image/png")
      return this.ascii(bytes, 0, "\x89PNG") || bytes[0] === 0x89;
    if (mimeType === "image/jpeg")
      return bytes[0] === 0xff && bytes[1] === 0xd8;
    if (mimeType === "image/webp")
      return this.ascii(bytes, 0, "RIFF") && this.ascii(bytes, 8, "WEBP");
    if (mimeType === "audio/wav")
      return this.ascii(bytes, 0, "RIFF") && this.ascii(bytes, 8, "WAVE");
    if (mimeType === "audio/ogg") return this.ascii(bytes, 0, "OggS");
    if (mimeType === "audio/mp4") return this.ascii(bytes, 4, "ftyp");
    if (mimeType === "audio/mpeg")
      return (
        this.ascii(bytes, 0, "ID3") ||
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
      );
    return false;
  }

  private ascii(bytes: Uint8Array, offset: number, value: string): boolean {
    return [...value].every(
      (character, index) => bytes[offset + index] === character.charCodeAt(0),
    );
  }

  private async rebuildRepositoryIndexInternal(): Promise<OfflinePracticeRepositoryIndex> {
    const records: OfflinePackRecord[] = [];
    for (const packId of await this.directoryNames(PACKS_ROOT)) {
      if (
        packId === ".staging" ||
        packId === ".quarantine" ||
        !isSafeLocalPathSegment(packId)
      )
        continue;
      for (const version of await this.directoryNames(
        `${PACKS_ROOT}/${packId}`,
      )) {
        if (!isSafeLocalPathSegment(version)) {
          continue;
        }
        const root = this.packPath(packId, version);
        if (!(await this.pathExists(`${root}/${COMMITTED_MARKER}`))) {
          await this.removePath(root);
          continue;
        }
        try {
          const pack = await this.validateCommittedDirectory(packId, version);
          records.push(this.recordFromManifest(pack.manifest));
        } catch {
          await this.quarantinePackWithoutIndex(packId, version);
        }
      }
    }

    const activePacks = [
      ...new Set(records.map((record) => record.packId)),
    ].map((packId) => {
      const candidates = records.filter((record) => record.packId === packId);
      const latest = candidates.sort((left, right) =>
        right.version.localeCompare(left.version),
      )[0];
      return { packId, version: latest.version };
    });
    const index = { schemaVersion: 1 as const, packs: records, activePacks };
    await this.writeIndex(index);
    return index;
  }

  private async indexPointsToValidPacks(
    index: OfflinePracticeRepositoryIndex,
  ): Promise<boolean> {
    for (const record of index.packs) {
      if (record.status !== "committed") return false;
      try {
        await this.validateCommittedDirectory(record.packId, record.version);
      } catch {
        return false;
      }
    }
    for (const reference of index.activePacks) {
      const record = index.packs.find(
        (item) =>
          item.packId === reference.packId &&
          item.version === reference.version,
      );
      if (!record) return false;
    }
    return true;
  }

  private async requireIndex(): Promise<OfflinePracticeRepositoryIndex> {
    const index = await this.readIndex();
    if (!index) {
      throw new OfflinePracticeRepositoryError(
        "The offline practice repository index is unavailable.",
        "storage",
      );
    }
    return index;
  }

  private async readIndex(): Promise<OfflinePracticeRepositoryIndex | null> {
    try {
      return repositoryIndexSchema.parse(
        await this.parseJson(await this.readBytes(INDEX_PATH)),
      );
    } catch {
      return null;
    }
  }

  private async writeIndex(
    index: OfflinePracticeRepositoryIndex,
  ): Promise<void> {
    repositoryIndexSchema.parse(index);
    await this.writeJson(INDEX_PARTIAL_PATH, index);
    await Filesystem.rename({
      directory: Directory.Data,
      from: INDEX_PARTIAL_PATH,
      to: INDEX_PATH,
    });
  }

  private async ensureRepositoryDirectories(): Promise<void> {
    await this.ensureDirectory(STAGING_ROOT);
    await this.ensureDirectory(QUARANTINE_ROOT);
    await this.ensureDirectory(PROFILES_ROOT);
  }

  private async ensureDirectory(path: string): Promise<void> {
    if (await this.pathExists(path)) return;
    await Filesystem.mkdir({
      directory: Directory.Data,
      path,
      recursive: true,
    });
  }

  private async cleanAbandonedStagingInternal(): Promise<void> {
    for (const downloadId of await this.directoryNames(STAGING_ROOT)) {
      if (isSafeLocalPathSegment(downloadId)) {
        await this.removePath(this.stagingPath(downloadId));
      }
    }
  }

  private async removePackSessions(packId: string): Promise<void> {
    for (const profileId of await this.directoryNames(PROFILES_ROOT)) {
      if (!isSafeLocalPathSegment(profileId)) continue;
      const sessionsPath = `${PROFILES_ROOT}/${profileId}/sessions`;
      for (const sessionFile of await this.directoryNames(sessionsPath)) {
        if (!sessionFile.endsWith(".json")) continue;
        try {
          const session = offlinePracticeSessionSchema.parse(
            await this.parseJson(
              await this.readBytes(`${sessionsPath}/${sessionFile}`),
            ),
          );
          if (session.packId === packId) {
            await this.removePath(`${sessionsPath}/${sessionFile}`);
          }
        } catch {
          // Unknown local files are not treated as practice sessions.
        }
      }
    }
  }

  private async quarantinePackWithoutIndex(
    packId: string,
    version: string,
  ): Promise<void> {
    const source = this.packPath(packId, version);
    if (!(await this.pathExists(source))) return;
    await this.ensureDirectory(QUARANTINE_ROOT);
    await Filesystem.rename({
      directory: Directory.Data,
      from: source,
      to: `${QUARANTINE_ROOT}/${packId}-${version}-${Date.now()}`,
    });
  }

  private recordFromManifest(manifest: OfflinePackManifest): OfflinePackRecord {
    const now = new Date().toISOString();
    return offlinePackRecordSchema.parse({
      schemaVersion: 1,
      packId: manifest.packId,
      version: manifest.version,
      moduleKey: manifest.moduleKey,
      categoryKey: manifest.categoryKey,
      title: manifest.title,
      status: "committed",
      installedAt: manifest.createdAt,
      lastValidatedAt: now,
      manifestSha256: manifest.manifestSha256,
      totalBytes: manifest.totalBytes,
    });
  }

  private async writeJson(path: string, value: unknown): Promise<void> {
    await this.writeBytes(
      path,
      new TextEncoder().encode(JSON.stringify(value)),
    );
  }

  private async writeText(path: string, value: string): Promise<void> {
    await this.writeBytes(path, new TextEncoder().encode(value));
  }

  private async writeBytes(path: string, bytes: Uint8Array): Promise<void> {
    await Filesystem.writeFile({
      directory: Directory.Data,
      path,
      data: bytesToBase64(bytes),
      recursive: true,
    });
  }

  private async readBytes(path: string): Promise<Uint8Array> {
    const result = await Filesystem.readFile({
      directory: Directory.Data,
      path,
    });
    if (result.data instanceof Blob) {
      return new Uint8Array(await result.data.arrayBuffer());
    }
    return base64ToBytes(result.data);
  }

  private async parseJson(bytes: Uint8Array): Promise<unknown> {
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await Filesystem.stat({ directory: Directory.Data, path });
      return true;
    } catch {
      return false;
    }
  }

  private async removePath(path: string): Promise<void> {
    try {
      await Filesystem.rmdir({
        directory: Directory.Data,
        path,
        recursive: true,
      });
      return;
    } catch {
      // It may be a file rather than a directory.
    }
    try {
      await Filesystem.deleteFile({ directory: Directory.Data, path });
    } catch {
      // Missing cleanup targets are already safe.
    }
  }

  private async directoryNames(path: string): Promise<string[]> {
    try {
      const result = await Filesystem.readdir({
        directory: Directory.Data,
        path,
      });
      return result.files
        .map((file) => this.basename(file.uri))
        .filter((name): name is string => name !== null);
    } catch {
      return [];
    }
  }

  private basename(uri: string): string | null {
    const withoutQuery = uri.split(/[?#]/, 1)[0];
    const name = withoutQuery.slice(withoutQuery.lastIndexOf("/") + 1);
    if (!name || name.includes("%") || name.includes("\\")) return null;
    return name;
  }

  private async walkBytes(path: string): Promise<number> {
    let children: string[];
    try {
      children = await this.directoryNames(path);
      if (children.length === 0 && !(await this.pathExists(path))) return 0;
    } catch {
      return 0;
    }
    if (children.length > 0) {
      return (
        await Promise.all(
          children.map((child) => this.walkBytes(`${path}/${child}`)),
        )
      ).reduce((total, size) => total + size, 0);
    }
    try {
      return (await this.readBytes(path)).byteLength;
    } catch {
      return 0;
    }
  }

  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.operationQueue;
    let release!: () => void;
    this.operationQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private createDownloadId(): string {
    return `download-${crypto.randomUUID().replaceAll("-", "")}`;
  }

  private assertSafeId(value: string, label: string): void {
    if (!isSafeLocalPathSegment(value)) {
      throw new OfflinePracticeRepositoryError(
        `Unsafe offline practice ${label}.`,
        "invalid_input",
      );
    }
  }

  private assertStaging(staging: OfflinePracticeStagingInstall): void {
    this.assertSafeId(staging.downloadId, "download ID");
    this.assertSafeId(staging.packId, "pack ID");
    this.assertSafeId(staging.version, "pack version");
  }

  private packPath(packId: string, version: string): string {
    return `${PACKS_ROOT}/${packId}/${version}`;
  }

  private stagingPath(downloadId: string): string {
    return `${STAGING_ROOT}/${downloadId}`;
  }

  private stagingFilePath(
    downloadId: string,
    file:
      | "manifest"
      | "content"
      | { assetId: string; mimeType: OfflinePracticeMimeType },
  ): string {
    if (file === "manifest")
      return `${this.stagingPath(downloadId)}/${MANIFEST_PARTIAL_PATH}`;
    if (file === "content")
      return `${this.stagingPath(downloadId)}/${CONTENT_PARTIAL_PATH}`;
    return `${this.stagingPath(downloadId)}/assets/${localAssetFileName(
      file.assetId,
      assetExtensionForMimeType(file.mimeType),
    )}`;
  }

  private assetPath(
    packId: string,
    version: string,
    assetId: string,
    mimeType: OfflinePracticeMimeType,
  ): string {
    return `${this.packPath(packId, version)}/assets/${localAssetFileName(
      assetId,
      assetExtensionForMimeType(mimeType),
    )}`;
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
