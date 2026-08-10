import { z } from "zod";

import {
  OFFLINE_PRACTICE_LIMITS,
  OFFLINE_PRACTICE_MIME_TYPES,
} from "./offlinePracticeLimits";
import {
  isSafeLocalPathSegment,
  isSafeRelativeApiPath,
} from "./offlinePracticePathSafety";

const safeIdSchema = z
  .string()
  .min(1)
  .max(OFFLINE_PRACTICE_LIMITS.maxIdLength)
  .refine(isSafeLocalPathSegment, "Expected a safe opaque identifier.");

const nonEmptyTextSchema = z
  .string()
  .min(1)
  .max(OFFLINE_PRACTICE_LIMITS.maxTextLength)
  .refine((value) => value.trim().length > 0, "Text cannot be blank.");

const titleSchema = z
  .string()
  .min(1)
  .max(OFFLINE_PRACTICE_LIMITS.maxTitleLength)
  .refine((value) => value.trim().length > 0, "Title cannot be blank.");

const schemaVersionSchema = z
  .number()
  .int()
  .refine(
    (value) =>
      (
        OFFLINE_PRACTICE_LIMITS.supportedSchemaVersions as readonly number[]
      ).includes(value),
    "Unsupported Offline Practice schema version.",
  );

const languageSchema = z.enum(["en", "fil"]);
export const offlinePracticeCategoryKeySchema = z.enum([
  "letters",
  "words",
  "phrases",
  "sentences",
  "passages",
  "comprehension",
]);
export type OfflinePracticeCategoryKey = z.infer<
  typeof offlinePracticeCategoryKeySchema
>;
const supportedLanguagesSchema = z
  .array(languageSchema)
  .min(1)
  .max(2)
  .refine(
    (values) => new Set(values).size === values.length,
    "Languages must be unique.",
  );
const availableClaraLanguagesSchema = z
  .array(languageSchema)
  .max(2)
  .refine(
    (values) => new Set(values).size === values.length,
    "Languages must be unique.",
  );

const statusSchema = z.enum(["available", "retired"]);
const sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected a SHA-256 hash.");
const dateTimeSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Expected a date-time value.",
  );
const relativeApiPathSchema = z
  .string()
  .max(OFFLINE_PRACTICE_LIMITS.maxPathLength)
  .refine(isSafeRelativeApiPath, "Expected a safe relative API path.");
const nonNegativeByteCountSchema = z.number().int().nonnegative();

export const offlineInteractionModeSchema = z.enum([
  "letter_read",
  "word_read",
  "phrase_read",
  "sentence_read",
  "passage_read",
  "comprehension_choice",
]);

export type OfflineInteractionMode = z.infer<
  typeof offlineInteractionModeSchema
>;
export type OfflineLanguage = z.infer<typeof languageSchema>;

export const offlineContentDescriptorSchema = z
  .object({
    relativeApiPath: relativeApiPathSchema,
    mimeType: z.literal(OFFLINE_PRACTICE_MIME_TYPES.content[0]),
    byteCount: nonNegativeByteCountSchema.max(
      OFFLINE_PRACTICE_LIMITS.maxContentBytes,
    ),
    sha256: sha256Schema,
  })
  .strict();

const imageMimeTypeSchema = z.enum(OFFLINE_PRACTICE_MIME_TYPES.image);
const claraAudioMimeTypeSchema = z.enum(OFFLINE_PRACTICE_MIME_TYPES.claraAudio);

const imageAssetDescriptorSchema = z
  .object({
    assetId: safeIdSchema,
    kind: z.literal("image"),
    language: languageSchema.optional(),
    mimeType: imageMimeTypeSchema,
    byteCount: nonNegativeByteCountSchema.max(
      OFFLINE_PRACTICE_LIMITS.maxSingleAssetBytes,
    ),
    sha256: sha256Schema,
    relativeApiPath: relativeApiPathSchema,
  })
  .strict();

const claraAudioAssetDescriptorSchema = z
  .object({
    assetId: safeIdSchema,
    kind: z.literal("clara_audio"),
    language: languageSchema,
    mimeType: claraAudioMimeTypeSchema,
    byteCount: nonNegativeByteCountSchema.max(
      OFFLINE_PRACTICE_LIMITS.maxSingleAssetBytes,
    ),
    sha256: sha256Schema,
    relativeApiPath: relativeApiPathSchema,
  })
  .strict();

export const offlineAssetDescriptorSchema = z.discriminatedUnion("kind", [
  imageAssetDescriptorSchema,
  claraAudioAssetDescriptorSchema,
]);

export type OfflineAssetDescriptor = z.infer<
  typeof offlineAssetDescriptorSchema
>;

export const offlinePackListEntrySchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    packId: safeIdSchema,
    version: safeIdSchema,
    moduleKey: safeIdSchema,
    categoryKey: offlinePracticeCategoryKeySchema.optional(),
    title: titleSchema,
    supportedLanguages: supportedLanguagesSchema,
    totalBytes: nonNegativeByteCountSchema.max(
      OFFLINE_PRACTICE_LIMITS.maxPackBytes,
    ),
    manifestSha256: sha256Schema,
    updatedAt: dateTimeSchema,
    status: statusSchema,
    manifestPath: relativeApiPathSchema,
  })
  .strict();

export type OfflinePackListEntry = z.infer<typeof offlinePackListEntrySchema>;

export const offlinePackManifestSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    packId: safeIdSchema,
    version: safeIdSchema,
    moduleKey: safeIdSchema,
    categoryKey: offlinePracticeCategoryKeySchema.optional(),
    title: titleSchema,
    minimumAppVersion: safeIdSchema,
    academicContentLanguage: z.literal("en"),
    supportedLanguages: supportedLanguagesSchema,
    availableClaraLanguages: availableClaraLanguagesSchema,
    content: offlineContentDescriptorSchema,
    assets: z
      .array(offlineAssetDescriptorSchema)
      .max(OFFLINE_PRACTICE_LIMITS.maxAssetCount)
      .refine(
        (assets) =>
          new Set(assets.map((asset) => asset.assetId)).size === assets.length,
        "Asset IDs must be unique.",
      ),
    totalBytes: nonNegativeByteCountSchema.max(
      OFFLINE_PRACTICE_LIMITS.maxPackBytes,
    ),
    manifestSha256: sha256Schema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    usableUntil: dateTimeSchema.optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    for (const language of manifest.availableClaraLanguages) {
      if (!manifest.supportedLanguages.includes(language)) {
        context.addIssue({
          code: "custom",
          path: ["availableClaraLanguages"],
          message: "Clara languages must be supported languages.",
        });
      }
    }

    if (manifest.content.byteCount > manifest.totalBytes) {
      context.addIssue({
        code: "custom",
        path: ["content", "byteCount"],
        message: "Content cannot be larger than the total pack.",
      });
    }
  });

export type OfflinePackManifest = z.infer<typeof offlinePackManifestSchema>;

export const offlineDialogueSchema = z
  .object({
    dialogueKey: safeIdSchema,
    language: languageSchema,
    text: nonEmptyTextSchema,
    fixedSpeechKey: safeIdSchema.optional(),
    localAudioAssetId: safeIdSchema.optional(),
  })
  .strict();

export type OfflineDialogue = z.infer<typeof offlineDialogueSchema>;

const comprehensionChoiceSchema = z
  .object({
    choiceId: safeIdSchema,
    label: nonEmptyTextSchema,
  })
  .strict();

const comprehensionPracticeSchema = z
  .object({
    choices: z
      .array(comprehensionChoiceSchema)
      .min(2)
      .max(OFFLINE_PRACTICE_LIMITS.maxChoiceCount)
      .refine(
        (choices) =>
          new Set(choices.map((choice) => choice.choiceId)).size ===
          choices.length,
        "Choice IDs must be unique.",
      ),
    correctChoiceId: safeIdSchema,
    feedbackText: nonEmptyTextSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !value.choices.some((choice) => choice.choiceId === value.correctChoiceId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["correctChoiceId"],
        message: "The practice answer must reference a choice.",
      });
    }
  });

export const offlinePracticeItemSchema = z
  .object({
    practiceItemId: safeIdSchema,
    interactionMode: offlineInteractionModeSchema,
    displayText: nonEmptyTextSchema,
    dialogueKeys: z
      .array(safeIdSchema)
      .min(1)
      .max(8)
      .refine(
        (keys) => new Set(keys).size === keys.length,
        "Dialogue keys must be unique.",
      ),
    assetIds: z
      .array(safeIdSchema)
      .max(OFFLINE_PRACTICE_LIMITS.maxAssetCount)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Asset IDs must be unique within an item.",
      ),
    comprehension: comprehensionPracticeSchema.optional(),
  })
  .strict()
  .superRefine((item, context) => {
    if (
      item.interactionMode === "comprehension_choice" &&
      !item.comprehension
    ) {
      context.addIssue({
        code: "custom",
        path: ["comprehension"],
        message: "Comprehension practice needs choices and feedback.",
      });
    }
    if (item.interactionMode !== "comprehension_choice" && item.comprehension) {
      context.addIssue({
        code: "custom",
        path: ["comprehension"],
        message: "Only comprehension practice may contain choices.",
      });
    }
  });

export type OfflinePracticeItem = z.infer<typeof offlinePracticeItemSchema>;

export const offlinePracticeModuleSchema = z
  .object({
    moduleKey: safeIdSchema,
    categoryKey: offlinePracticeCategoryKeySchema.optional(),
    title: titleSchema,
    items: z
      .array(offlinePracticeItemSchema)
      .min(1)
      .max(OFFLINE_PRACTICE_LIMITS.maxItemCount)
      .refine(
        (items) =>
          new Set(items.map((item) => item.practiceItemId)).size ===
          items.length,
        "Practice item IDs must be unique within a module.",
      ),
  })
  .strict();

export const offlineContentDocumentSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    packId: safeIdSchema,
    version: safeIdSchema,
    dialogues: z
      .array(offlineDialogueSchema)
      .max(OFFLINE_PRACTICE_LIMITS.maxDialogueCount)
      .refine(
        (dialogues) =>
          new Set(dialogues.map((dialogue) => dialogue.dialogueKey)).size ===
          dialogues.length,
        "Dialogue keys must be unique.",
      ),
    modules: z
      .array(offlinePracticeModuleSchema)
      .min(1)
      .max(OFFLINE_PRACTICE_LIMITS.maxModuleCount)
      .refine(
        (modules) =>
          new Set(modules.map((module) => module.moduleKey)).size ===
          modules.length,
        "Module keys must be unique.",
      ),
  })
  .strict();

export type OfflineContentDocument = z.infer<
  typeof offlineContentDocumentSchema
>;

export const offlinePackRecordSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    packId: safeIdSchema,
    version: safeIdSchema,
    moduleKey: safeIdSchema,
    categoryKey: offlinePracticeCategoryKeySchema.optional(),
    title: titleSchema,
    status: z.enum(["committed", "corrupt"]),
    installedAt: dateTimeSchema,
    lastValidatedAt: dateTimeSchema,
    manifestSha256: sha256Schema,
    totalBytes: nonNegativeByteCountSchema.max(
      OFFLINE_PRACTICE_LIMITS.maxPackBytes,
    ),
  })
  .strict();

export type OfflinePackRecord = z.infer<typeof offlinePackRecordSchema>;

const offlineSessionItemStateSchema = z
  .object({
    practiceItemId: safeIdSchema,
    visited: z.boolean(),
    selectedChoiceId: safeIdSchema.optional(),
    acknowledgedFeedback: z.boolean().optional(),
  })
  .strict();

export const offlinePracticeSessionSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    localSessionId: safeIdSchema,
    localProfileId: safeIdSchema,
    packId: safeIdSchema,
    packVersion: safeIdSchema,
    moduleKey: safeIdSchema,
    currentItemIndex: z
      .number()
      .int()
      .nonnegative()
      .max(OFFLINE_PRACTICE_LIMITS.maxSessionItemCount),
    itemState: z
      .array(offlineSessionItemStateSchema)
      .max(OFFLINE_PRACTICE_LIMITS.maxSessionItemCount)
      .refine(
        (items) =>
          new Set(items.map((item) => item.practiceItemId)).size ===
          items.length,
        "Session item IDs must be unique.",
      ),
    startedAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    completedLocally: z.boolean(),
    classification: z.literal("practice-only"),
  })
  .strict();

export type OfflinePracticeSession = z.infer<
  typeof offlinePracticeSessionSchema
>;

export type OfflinePracticePack = {
  manifest: OfflinePackManifest;
  content: OfflineContentDocument;
};

const packEnvelopeSchema = z
  .object({
    manifest: z.unknown(),
    content: z.unknown(),
  })
  .strict();

/**
 * Parses both halves of a pack and verifies references that cannot be
 * expressed by an individual JSON schema, such as language/audio matching.
 */
export function parseOfflinePracticePack(input: unknown): OfflinePracticePack {
  const envelope = packEnvelopeSchema.parse(input);
  const manifest = offlinePackManifestSchema.parse(envelope.manifest);
  const content = offlineContentDocumentSchema.parse(envelope.content);
  const assetById = new Map(
    manifest.assets.map((asset) => [asset.assetId, asset]),
  );
  const dialogueByKey = new Map(
    content.dialogues.map((dialogue) => [dialogue.dialogueKey, dialogue]),
  );
  let itemCount = 0;

  if (
    content.packId !== manifest.packId ||
    content.version !== manifest.version
  ) {
    throw new Error("Offline content does not match its pack manifest.");
  }

  for (const [moduleIndex, module] of content.modules.entries()) {
    if (module.moduleKey !== manifest.moduleKey) {
      throw new Error(
        `Offline module ${moduleIndex} does not match the pack module.`,
      );
    }
    if (
      module.categoryKey &&
      manifest.categoryKey &&
      module.categoryKey !== manifest.categoryKey
    ) {
      throw new Error(
        `Offline module ${moduleIndex} does not match the pack category.`,
      );
    }

    itemCount += module.items.length;
    for (const [itemIndex, item] of module.items.entries()) {
      for (const dialogueKey of item.dialogueKeys) {
        if (!dialogueByKey.has(dialogueKey)) {
          throw new Error(
            `Offline item ${item.practiceItemId} references missing dialogue ${dialogueKey}.`,
          );
        }
      }
      for (const assetId of item.assetIds) {
        if (!assetById.has(assetId)) {
          throw new Error(
            `Offline item ${item.practiceItemId} references missing asset ${assetId}.`,
          );
        }
      }

      if (itemCount > OFFLINE_PRACTICE_LIMITS.maxItemCount) {
        throw new Error("Offline content exceeds the item limit.");
      }
      void itemIndex;
    }
  }

  for (const dialogue of content.dialogues) {
    if (!dialogue.localAudioAssetId) continue;
    const asset = assetById.get(dialogue.localAudioAssetId);
    if (!asset || asset.kind !== "clara_audio") {
      throw new Error(
        `Dialogue ${dialogue.dialogueKey} references a non-Clara audio asset.`,
      );
    }
    if (asset.language !== dialogue.language) {
      throw new Error(
        `Dialogue ${dialogue.dialogueKey} does not match its audio language.`,
      );
    }
  }

  return { manifest, content };
}
