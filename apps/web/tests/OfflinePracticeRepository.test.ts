import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeFileSystem = vi.hoisted(() => {
  const files = new Map<string, string>();
  const directories = new Set<string>();

  const addParents = (path: string) => {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  };
  const removePrefix = (path: string) => {
    for (const key of [...files.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) files.delete(key);
    }
    for (const key of [...directories]) {
      if (key === path || key.startsWith(`${path}/`)) directories.delete(key);
    }
  };
  const entries = (path: string) => {
    const prefix = path ? `${path}/` : "";
    const names = new Set<string>();
    for (const key of [...files.keys(), ...directories]) {
      if (!key.startsWith(prefix)) continue;
      const remainder = key.slice(prefix.length);
      if (remainder && !remainder.includes("/")) names.add(remainder);
    }
    return [...names].map((name) => ({
      uri: `file:///data/${prefix}${name}`,
      mtime: 0,
    }));
  };

  return {
    files,
    directories,
    reset: () => {
      files.clear();
      directories.clear();
    },
    api: {
      mkdir: vi.fn(
        async ({ path, recursive }: { path: string; recursive?: boolean }) => {
          if (directories.has(path)) {
            throw new Error("directory already exists");
          }
          if (recursive) addParents(path);
          directories.add(path);
        },
      ),
      writeFile: vi.fn(
        async ({ path, data }: { path: string; data: string }) => {
          addParents(path);
          files.set(path, data);
        },
      ),
      readFile: vi.fn(async ({ path }: { path: string }) => {
        const data = files.get(path);
        if (data === undefined) throw new Error("missing file");
        return { data };
      }),
      deleteFile: vi.fn(async ({ path }: { path: string }) => {
        if (!files.delete(path)) throw new Error("missing file");
      }),
      rmdir: vi.fn(async ({ path }: { path: string }) => {
        if (!directories.has(path)) throw new Error("missing directory");
        removePrefix(path);
      }),
      readdir: vi.fn(async ({ path }: { path: string }) => {
        if (!directories.has(path)) throw new Error("missing directory");
        return { files: entries(path) };
      }),
      stat: vi.fn(async ({ path }: { path: string }) => {
        if (!files.has(path) && !directories.has(path))
          throw new Error("missing path");
        return { uri: `file:///data/${path}`, mtime: 0 };
      }),
      getUri: vi.fn(async ({ path }: { path: string }) => ({
        uri: `file:///data/${path}`,
      })),
      rename: vi.fn(async ({ from, to }: { from: string; to: string }) => {
        const file = files.get(from);
        if (file !== undefined) {
          addParents(to);
          files.set(to, file);
          files.delete(from);
          return;
        }
        if (!directories.has(from)) throw new Error("missing source");
        addParents(to);
        directories.add(to);
        for (const [key, value] of [...files.entries()]) {
          if (key.startsWith(`${from}/`)) {
            files.set(`${to}/${key.slice(from.length + 1)}`, value);
            files.delete(key);
          }
        }
        for (const key of [...directories]) {
          if (key.startsWith(`${from}/`)) {
            directories.add(`${to}/${key.slice(from.length + 1)}`);
            directories.delete(key);
          }
        }
        directories.delete(from);
      }),
    },
  };
});

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Filesystem: fakeFileSystem.api,
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));
vi.mock("@capacitor/file-transfer", () => ({
  FileTransfer: { downloadFile: vi.fn() },
}));

import {
  OfflinePracticeRepository,
  OfflinePracticeRepositoryError,
} from "../src/features/offline-practice/offlinePracticeRepository";

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

async function buildPack(version = "2026.08.1") {
  const content = {
    schemaVersion: 1,
    packId: "letters-foundations-v1",
    version,
    dialogues: [
      {
        dialogueKey: "letters-instruction-en",
        language: "en",
        text: "Say the letter.",
        fixedSpeechKey: "lesson-1-mission-1",
        localAudioAssetId: "clara-letters-en",
      },
    ],
    modules: [
      {
        moduleKey: "letters",
        title: "Letter Practice",
        items: [
          {
            practiceItemId: "letters-a",
            interactionMode: "letter_read",
            displayText: "A a",
            dialogueKeys: ["letters-instruction-en"],
            assetIds: ["clara-letters-en"],
          },
        ],
      },
    ],
  } as const;
  const contentBytes = new TextEncoder().encode(JSON.stringify(content));
  const assetHash = await sha256(audioBytes);
  const manifest = {
    schemaVersion: 1,
    packId: "letters-foundations-v1",
    version,
    moduleKey: "letters",
    title: "Letter Practice",
    minimumAppVersion: "1.0.0",
    academicContentLanguage: "en",
    supportedLanguages: ["en"],
    availableClaraLanguages: ["en"],
    content: {
      relativeApiPath: `/api/learners/offline-practice/packs/letters-foundations-v1/versions/${version}/content`,
      mimeType: "application/json",
      byteCount: contentBytes.length,
      sha256: await sha256(contentBytes),
    },
    assets: [
      {
        assetId: "clara-letters-en",
        kind: "clara_audio",
        language: "en",
        mimeType: "audio/wav",
        byteCount: audioBytes.length,
        sha256: assetHash,
        relativeApiPath: `/api/learners/offline-practice/packs/letters-foundations-v1/versions/${version}/assets/clara-letters-en`,
      },
    ],
    totalBytes: contentBytes.length + audioBytes.length,
    manifestSha256: "",
    createdAt: "2026-08-10T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
  } as const;
  const manifestHash = await sha256(
    new TextEncoder().encode(
      JSON.stringify({ ...manifest, manifestSha256: "" }),
    ),
  );
  const finalManifest = { ...manifest, manifestSha256: manifestHash };
  return {
    manifest: finalManifest,
    manifestBytes: new TextEncoder().encode(JSON.stringify(finalManifest)),
    contentBytes,
    audioBytes,
  };
}

async function installPack(
  repository: OfflinePracticeRepository,
  pack: Awaited<ReturnType<typeof buildPack>>,
  downloadId: string,
) {
  const staging = await repository.startStagingInstall(
    pack.manifest.packId,
    pack.manifest.version,
    downloadId,
  );
  await repository.writeStagingBytes(staging, "manifest", pack.manifestBytes);
  await repository.writeStagingBytes(staging, "content", pack.contentBytes);
  await repository.writeStagingBytes(
    staging,
    { assetId: "clara-letters-en", mimeType: "audio/wav" },
    pack.audioBytes,
  );
  return repository.commitStagingPack(staging);
}

describe("OfflinePracticeRepository", () => {
  beforeEach(() => {
    fakeFileSystem.reset();
    vi.clearAllMocks();
  });

  it("reopens when the repository root directories already exist", async () => {
    await new OfflinePracticeRepository().initialize();

    await expect(new OfflinePracticeRepository().initialize()).resolves.toBeUndefined();
  });

  it("commits only fully validated staged content and resolves local assets", async () => {
    const repository = new OfflinePracticeRepository();
    const pack = await buildPack();
    await repository.initialize();
    const staging = await repository.startStagingInstall(
      pack.manifest.packId,
      pack.manifest.version,
      "download-1",
    );

    await repository.writeStagingBytes(staging, "manifest", pack.manifestBytes);
    await repository.writeStagingBytes(staging, "content", pack.contentBytes);
    await repository.writeStagingBytes(
      staging,
      { assetId: "clara-letters-en", mimeType: "audio/wav" },
      pack.audioBytes,
    );

    const record = await repository.commitStagingPack(staging);
    expect(record.status).toBe("committed");
    expect(await repository.listCommittedPacks()).toHaveLength(1);
    expect(
      await repository.getActivePack("letters-foundations-v1"),
    ).not.toBeNull();
    expect(
      (
        await repository.resolveLocalAsset(
          "letters-foundations-v1",
          "clara-letters-en",
        )
      ).uri,
    ).toContain("clara-letters-en.wav");
    expect(
      fakeFileSystem.files.has(
        "offline-practice/packs/letters-foundations-v1/2026.08.1/COMMITTED",
      ),
    ).toBe(true);
  });

  it("ignores staging and recovers from a corrupt index on restart", async () => {
    const repository = new OfflinePracticeRepository();
    const pack = await buildPack();
    await repository.initialize();
    await repository.startStagingInstall(
      "letters-foundations-v1",
      "2026.08.9",
      "abandoned",
    );
    const staging = await repository.startStagingInstall(
      "letters-foundations-v1",
      "2026.08.1",
      "download-2",
    );
    await repository.writeStagingBytes(staging, "manifest", pack.manifestBytes);
    await repository.writeStagingBytes(staging, "content", pack.contentBytes);
    await repository.writeStagingBytes(
      staging,
      { assetId: "clara-letters-en", mimeType: "audio/wav" },
      pack.audioBytes,
    );
    await repository.commitStagingPack(staging);
    const partial = new TextEncoder().encode("not-json");
    await fakeFileSystem.api.writeFile({
      path: "offline-practice/repository-v1.json",
      data: btoa(String.fromCharCode(...partial)),
    });

    const restarted = new OfflinePracticeRepository();
    expect(await restarted.listCommittedPacks()).toHaveLength(1);
    expect(
      fakeFileSystem.files.has("offline-practice/packs/.staging/abandoned"),
    ).toBe(false);
    expect(
      fakeFileSystem.files.has("offline-practice/packs/.staging/download-2"),
    ).toBe(false);
  });

  it("rejects tampered bytes, never activates them, and preserves the previous version", async () => {
    const repository = new OfflinePracticeRepository();
    const pack = await buildPack();
    await repository.initialize();
    const staging = await repository.startStagingInstall(
      "letters-foundations-v1",
      "2026.08.1",
      "download-3",
    );
    await repository.writeStagingBytes(staging, "manifest", pack.manifestBytes);
    await repository.writeStagingBytes(
      staging,
      "content",
      new TextEncoder().encode("tampered"),
    );
    await repository.writeStagingBytes(
      staging,
      { assetId: "clara-letters-en", mimeType: "audio/wav" },
      pack.audioBytes,
    );

    await expect(repository.commitStagingPack(staging)).rejects.toBeInstanceOf(
      OfflinePracticeRepositoryError,
    );
    expect(await repository.listCommittedPacks()).toHaveLength(0);
    await repository.discardStaging(staging);
    expect(await repository.calculateApproximateStoredBytes()).toBeGreaterThan(
      0,
    );
  });

  it("keeps the active version when a newer staged update fails validation", async () => {
    const repository = new OfflinePracticeRepository();
    const firstPack = await buildPack("2026.08.1");
    const secondPack = await buildPack("2026.08.2");
    await repository.initialize();
    await installPack(repository, firstPack, "download-first");

    const failedStaging = await repository.startStagingInstall(
      secondPack.manifest.packId,
      secondPack.manifest.version,
      "download-failed-update",
    );
    await repository.writeStagingBytes(
      failedStaging,
      "manifest",
      secondPack.manifestBytes,
    );
    await repository.writeStagingBytes(
      failedStaging,
      "content",
      new TextEncoder().encode("tampered update"),
    );
    await repository.writeStagingBytes(
      failedStaging,
      { assetId: "clara-letters-en", mimeType: "audio/wav" },
      secondPack.audioBytes,
    );

    await expect(
      repository.commitStagingPack(failedStaging),
    ).rejects.toBeInstanceOf(OfflinePracticeRepositoryError);
    expect(
      (await repository.getActivePack("letters-foundations-v1"))?.record,
    ).toMatchObject({
      version: "2026.08.1",
    });
    await repository.discardStaging(failedStaging);
  });

  it("deletes one pack and all remaining offline data without touching network state", async () => {
    const repository = new OfflinePracticeRepository();
    const pack = await buildPack();
    await repository.initialize();
    const staging = await repository.startStagingInstall(
      "letters-foundations-v1",
      "2026.08.1",
      "download-4",
    );
    await repository.writeStagingBytes(staging, "manifest", pack.manifestBytes);
    await repository.writeStagingBytes(staging, "content", pack.contentBytes);
    await repository.writeStagingBytes(
      staging,
      { assetId: "clara-letters-en", mimeType: "audio/wav" },
      pack.audioBytes,
    );
    await repository.commitStagingPack(staging);
    await repository.deletePack("letters-foundations-v1");
    expect(await repository.listCommittedPacks()).toHaveLength(0);
    await repository.deleteAll();
    expect(await repository.listCommittedPacks()).toHaveLength(0);
    expect(
      fakeFileSystem.files.has("offline-practice/repository-v1.json"),
    ).toBe(true);
  });

  it("persists and resumes practice-only session state inside one profile namespace", async () => {
    const repository = new OfflinePracticeRepository();
    const pack = await buildPack();
    await installPack(repository, pack, "download-session");
    const session = {
      schemaVersion: 1 as const,
      localSessionId: "session-local-1",
      localProfileId: "p-profile-a",
      packId: "letters-foundations-v1",
      packVersion: "2026.08.1",
      moduleKey: "letters",
      currentItemIndex: 1,
      itemState: [{ practiceItemId: "letters-a", visited: true }],
      startedAt: "2026-08-10T00:00:00Z",
      updatedAt: "2026-08-10T00:01:00Z",
      completedLocally: false,
      classification: "practice-only" as const,
    };

    await repository.writePracticeSession("p-profile-a", session);
    expect(
      await repository.readPracticeSession(
        "p-profile-a",
        "letters-foundations-v1",
        "2026.08.1",
      ),
    ).toEqual(session);
    expect(
      await repository.readPracticeSession(
        "p-profile-b",
        "letters-foundations-v1",
        "2026.08.1",
      ),
    ).toBeNull();
  });

  it("rejects unsafe local identifiers before filesystem access", async () => {
    const repository = new OfflinePracticeRepository();
    await expect(repository.getActivePack("../escape")).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(
      repository.startStagingInstall("safe-pack", "../escape"),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });
});
