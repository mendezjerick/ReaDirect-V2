import { describe, expect, it } from "vitest";

import {
  assetExtensionForMimeType,
  OFFLINE_PRACTICE_LIMITS,
} from "../src/features/offline-practice/offlinePracticeLimits";
import {
  isSafeLocalPathSegment,
  isSafeRelativeApiPath,
  localAssetFileName,
} from "../src/features/offline-practice/offlinePracticePathSafety";
import {
  offlineContentDocumentSchema,
  offlinePackListEntrySchema,
  offlinePackRecordSchema,
  offlinePracticeSessionSchema,
  parseOfflinePracticePack,
} from "../src/features/offline-practice/offlinePracticeSchemas";
import {
  invalidAcademicFieldPack,
  invalidCanonicalIdentifierPack,
  invalidMimePack,
  invalidMissingContentPack,
  invalidOversizedManifestPack,
  invalidPathTraversalPack,
  invalidSchemaVersionPack,
  invalidSha256Pack,
  invalidUnknownInteractionPack,
  invalidWrongLanguageDialoguePack,
  validBilingualClaraDialogue,
  validComprehensionPractice,
  validLetterPracticePack,
  validOptionalAudioFallback,
} from "./fixtures/offlinePracticeFixtures";

describe("Offline Practice contracts", () => {
  it("parses a valid letter pack and its bilingual Clara dialogue", () => {
    const pack = parseOfflinePracticePack(validLetterPracticePack);

    expect(pack.manifest.packId).toBe("letters-foundations-v1");
    expect(validBilingualClaraDialogue).toHaveLength(2);
    expect(pack.content.modules[0].items[0].interactionMode).toBe(
      "letter_read",
    );
  });

  it("parses comprehension practice without giving it academic fields", () => {
    const pack = parseOfflinePracticePack(validComprehensionPractice);
    const item = pack.content.modules[0].items[0];

    expect(item.comprehension?.correctChoiceId).toBe("choice-f");
    expect(item.interactionMode).toBe("comprehension_choice");
  });

  it("supports text-only Clara fallback when fixed audio is absent", () => {
    const pack = parseOfflinePracticePack(validOptionalAudioFallback);
    expect(
      pack.content.dialogues.every((dialogue) => !dialogue.localAudioAssetId),
    ).toBe(true);
  });

  it.each([
    ["path traversal", invalidPathTraversalPack],
    ["unknown interaction", invalidUnknownInteractionPack],
    ["unsupported schema", invalidSchemaVersionPack],
    ["oversized pack", invalidOversizedManifestPack],
    ["invalid MIME", invalidMimePack],
    ["invalid SHA-256", invalidSha256Pack],
    ["missing content", invalidMissingContentPack],
    ["unexpected academic field", invalidAcademicFieldPack],
    ["canonical identifier", invalidCanonicalIdentifierPack],
  ])("rejects %s", (_name, fixture) => {
    expect(() => parseOfflinePracticePack(fixture)).toThrow();
  });

  it("rejects a Clara audio asset whose language differs from its dialogue", () => {
    expect(() =>
      parseOfflinePracticePack(invalidWrongLanguageDialoguePack),
    ).toThrow(/audio language/);
  });

  it("rejects unknown fields in local records", () => {
    expect(
      offlinePackRecordSchema.safeParse({
        schemaVersion: 1,
        packId: "letters-foundations-v1",
        version: "2026.08.1",
        moduleKey: "letters",
        title: "Letter Practice",
        status: "committed",
        installedAt: "2026-08-10T00:00:00Z",
        lastValidatedAt: "2026-08-10T00:00:00Z",
        manifestSha256: "a".repeat(64),
        totalBytes: 100,
        score: 100,
      }).success,
    ).toBe(false);

    expect(
      offlinePracticeSessionSchema.safeParse({
        schemaVersion: 1,
        localSessionId: "session-1",
        localProfileId: "profile-1",
        packId: "letters-foundations-v1",
        packVersion: "2026.08.1",
        moduleKey: "letters",
        currentItemIndex: 0,
        itemState: [],
        startedAt: "2026-08-10T00:00:00Z",
        updatedAt: "2026-08-10T00:00:00Z",
        completedLocally: false,
        classification: "practice-only",
        pending_upload: true,
      }).success,
    ).toBe(false);
  });

  it("keeps the interaction set closed and requires comprehension structure", () => {
    expect(
      offlineContentDocumentSchema.safeParse({
        ...validLetterPracticePack.content,
        modules: [
          {
            ...validLetterPracticePack.content.modules[0],
            items: [
              {
                ...validLetterPracticePack.content.modules[0].items[0],
                interactionMode: "comprehension_choice",
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("validates list entries and local record status", () => {
    expect(
      offlinePackListEntrySchema.safeParse({
        schemaVersion: 1,
        packId: "letters-foundations-v1",
        version: "2026.08.1",
        moduleKey: "letters",
        title: "Letter Practice",
        supportedLanguages: ["en", "fil"],
        totalBytes: 100,
        manifestSha256: "a".repeat(64),
        updatedAt: "2026-08-10T00:00:00Z",
        status: "available",
        manifestPath: "/api/learners/offline-practice/packs/letters",
      }).success,
    ).toBe(true);
  });
});

describe("Offline Practice path and asset safety", () => {
  it.each([
    ["", false],
    ["..", false],
    ["../pack", false],
    ["pack/asset", false],
    ["pack\\asset", false],
    ["%2e%2e", false],
    ["pack\u0000", false],
    ["pack-id", true],
    ["2026.08.1", true],
  ])("checks local path segment %j", (value, expected) => {
    expect(isSafeLocalPathSegment(value)).toBe(expected);
  });

  it.each([
    ["/api/learners/offline-practice/packs/letters", true],
    ["/api/learners/offline-practice/packs/../secret", false],
    ["https://example.test/file", false],
    ["/api//offline-practice", false],
    ["/api/learners/offline-practice/%2e%2e", false],
  ])("checks relative API path %j", (value, expected) => {
    expect(isSafeRelativeApiPath(value)).toBe(expected);
  });

  it("maps approved MIME types to generated extensions", () => {
    expect(assetExtensionForMimeType("audio/wav")).toBe("wav");
    expect(assetExtensionForMimeType("image/webp")).toBe("webp");
    expect(localAssetFileName("clara-audio", "wav")).toBe("clara-audio.wav");
  });

  it("exposes conservative centralized limits", () => {
    expect(OFFLINE_PRACTICE_LIMITS.maxPackBytes).toBe(50 * 1024 * 1024);
    expect(OFFLINE_PRACTICE_LIMITS.maxAssetCount).toBe(200);
    expect(OFFLINE_PRACTICE_LIMITS.maxManifestBytes).toBe(256 * 1024);
  });
});
