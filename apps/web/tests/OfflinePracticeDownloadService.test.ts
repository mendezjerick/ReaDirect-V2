import { beforeEach, describe, expect, it, vi } from "vitest";

const loadLearnerSession = vi.hoisted(() => vi.fn());
const isNativePlatform = vi.hoisted(() => vi.fn(() => false));
const fileTransferDownloadFile = vi.hoisted(() => vi.fn());
vi.mock("../src/features/learner-auth/learnerApi", () => ({
  loadLearnerSession,
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform },
}));
vi.mock("@capacitor/file-transfer", () => ({
  FileTransfer: { downloadFile: fileTransferDownloadFile },
}));

import { OfflinePracticeDownloadService } from "../src/features/offline-practice/offlinePracticeDownloadService";
import type { OfflinePackListEntry } from "../src/features/offline-practice/offlinePracticeSchemas";

const contentBytes = new TextEncoder().encode(
  JSON.stringify({ schemaVersion: 1, packId: "letters-foundations-v1" }),
);
const audioBytes = new Uint8Array([
  ...new TextEncoder().encode("RIFF"),
  0,
  0,
  0,
  0,
  ...new TextEncoder().encode("WAVE"),
]);

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function buildResponses() {
  const contentHash = await sha256(contentBytes);
  const audioHash = await sha256(audioBytes);
  const manifestWithoutHash = {
    schemaVersion: 1,
    packId: "letters-foundations-v1",
    version: "2026.08.1",
    moduleKey: "letters",
    title: "Letter Practice",
    minimumAppVersion: "1.0.0",
    academicContentLanguage: "en",
    supportedLanguages: ["en"],
    availableClaraLanguages: ["en"],
    content: {
      relativeApiPath:
        "/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.1/content",
      mimeType: "application/json",
      byteCount: contentBytes.length,
      sha256: contentHash,
    },
    assets: [
      {
        assetId: "clara-letters-en",
        kind: "clara_audio",
        language: "en",
        mimeType: "audio/wav",
        byteCount: audioBytes.length,
        sha256: audioHash,
        relativeApiPath:
          "/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.1/assets/clara-letters-en",
      },
    ],
    totalBytes: contentBytes.length + audioBytes.length,
    manifestSha256: "",
    createdAt: "2026-08-10T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
  } as const;
  const manifestSha256 = await sha256(
    new TextEncoder().encode(JSON.stringify(manifestWithoutHash)),
  );
  const manifest = { ...manifestWithoutHash, manifestSha256 };
  const entry: OfflinePackListEntry = {
    schemaVersion: 1,
    packId: manifest.packId,
    version: manifest.version,
    moduleKey: manifest.moduleKey,
    title: manifest.title,
    supportedLanguages: ["en"],
    totalBytes: manifest.totalBytes,
    manifestSha256,
    updatedAt: manifest.updatedAt,
    status: "available",
    manifestPath:
      "/api/learners/offline-practice/packs/letters-foundations-v1/manifest",
  };
  return { entry, manifest, contentHash, audioHash };
}

describe("OfflinePracticeDownloadService", () => {
  beforeEach(() => {
    loadLearnerSession.mockReturnValue({ token: "session-token" });
    isNativePlatform.mockReturnValue(false);
    fileTransferDownloadFile.mockReset();
    vi.restoreAllMocks();
  });

  it("uses the authenticated API, stages every resource, and commits through the repository", async () => {
    const { entry, manifest } = await buildResponses();
    const responses = [
      new Response(JSON.stringify(manifest), {
        headers: { "content-type": "application/json" },
      }),
      new Response(contentBytes, {
        headers: { "content-type": "application/json" },
      }),
      new Response(audioBytes, { headers: { "content-type": "audio/wav" } }),
    ];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2]);
    const repository = {
      startStagingInstall: vi.fn().mockResolvedValue({
        downloadId: "download-1",
        packId: entry.packId,
        version: entry.version,
      }),
      writeStagingBytes: vi.fn(),
      commitStagingPack: vi.fn().mockResolvedValue({ status: "committed" }),
      discardStaging: vi.fn(),
    };

    const result = await new OfflinePracticeDownloadService(
      repository as never,
    ).downloadPack(entry);

    expect(result.status).toBe("committed");
    expect(repository.writeStagingBytes).toHaveBeenCalledTimes(3);
    expect(repository.commitStagingPack).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toMatchObject({
        headers: {
          Authorization: "Bearer session-token",
        },
      });
    }
  });

  it("falls back to the native transfer only after a WebView resource request fails", async () => {
    const { entry, manifest } = await buildResponses();
    isNativePlatform.mockReturnValue(true);
    fileTransferDownloadFile.mockResolvedValue({});
    const responses = [
      new Response(JSON.stringify(manifest), {
        headers: { "content-type": "application/json" },
      }),
      new Response(contentBytes, {
        headers: { "content-type": "application/json" },
      }),
      new Response(audioBytes, { headers: { "content-type": "audio/wav" } }),
    ];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2]);
    const repository = {
      startStagingInstall: vi.fn().mockResolvedValue({
        downloadId: "download-1",
        packId: entry.packId,
        version: entry.version,
      }),
      getStagingFileUri: vi.fn().mockResolvedValue("file:///data/pack.tmp"),
      writeStagingBytes: vi.fn(),
      commitStagingPack: vi.fn().mockResolvedValue({ status: "committed" }),
      discardStaging: vi.fn(),
    };

    await new OfflinePracticeDownloadService(repository as never).downloadPack(
      entry,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fileTransferDownloadFile).not.toHaveBeenCalled();
    expect(repository.writeStagingBytes).toHaveBeenCalledTimes(3);
  });

  it("uses FileTransfer when the native WebView request cannot reach a resource", async () => {
    const { entry, manifest } = await buildResponses();
    isNativePlatform.mockReturnValue(true);
    fileTransferDownloadFile.mockResolvedValue({});
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(manifest), {
          headers: { "content-type": "application/json" },
        }),
      )
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(
        new Response(audioBytes, { headers: { "content-type": "audio/wav" } }),
      );
    const repository = {
      startStagingInstall: vi.fn().mockResolvedValue({
        downloadId: "download-1",
        packId: entry.packId,
        version: entry.version,
      }),
      getStagingFileUri: vi.fn().mockResolvedValue("file:///data/pack.tmp"),
      writeStagingBytes: vi.fn(),
      commitStagingPack: vi.fn().mockResolvedValue({ status: "committed" }),
      discardStaging: vi.fn(),
    };

    await new OfflinePracticeDownloadService(repository as never).downloadPack(
      entry,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fileTransferDownloadFile).toHaveBeenCalledOnce();
    expect(repository.getStagingFileUri).toHaveBeenCalledWith(
      expect.objectContaining({ packId: entry.packId }),
      "content",
    );
    expect(repository.writeStagingBytes).toHaveBeenCalledTimes(2);
  });

  it("does not start staging when the authorized manifest disagrees with list metadata", async () => {
    const { entry, manifest } = await buildResponses();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...manifest, version: "2026.08.2" }), {
        headers: { "content-type": "application/json" },
      }),
    );
    const repository = { startStagingInstall: vi.fn() };

    await expect(
      new OfflinePracticeDownloadService(repository as never).downloadPack(
        entry,
      ),
    ).rejects.toMatchObject({
      code: "validation",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(repository.startStagingInstall).not.toHaveBeenCalled();
  });

  it("requires the existing learner session token and never creates a second token store", async () => {
    loadLearnerSession.mockReturnValue(null);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { entry } = await buildResponses();

    await expect(
      new OfflinePracticeDownloadService({} as never).downloadPack(entry),
    ).rejects.toMatchObject({ code: "unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("processes category packs sequentially and preserves successful commits", async () => {
    const { entry } = await buildResponses();
    const service = new OfflinePracticeDownloadService({} as never);
    const committed = {
      status: "committed",
      packId: entry.packId,
    } as never;
    const failure = new Error("one module failed");
    vi.spyOn(service, "downloadPack")
      .mockResolvedValueOnce(committed)
      .mockRejectedValueOnce(failure);

    const result = await service.downloadPacks([entry, entry]);

    expect(result.committed).toEqual([committed]);
    expect(result.failed).toHaveLength(1);
    expect(service.downloadPack).toHaveBeenCalledTimes(2);
  });
});
