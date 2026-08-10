/**
 * Phase A limits for untrusted Offline Practice metadata.
 *
 * These values are deliberately centralized so future download/storage code
 * cannot quietly introduce a second, weaker validation policy.
 */
export const OFFLINE_PRACTICE_LIMITS = {
  maxPackBytes: 50 * 1024 * 1024,
  maxManifestBytes: 256 * 1024,
  maxContentBytes: 2 * 1024 * 1024,
  maxSingleAssetBytes: 20 * 1024 * 1024,
  maxItemCount: 500,
  maxAssetCount: 200,
  maxDialogueCount: 500,
  maxModuleCount: 12,
  maxChoiceCount: 6,
  maxIdLength: 96,
  maxTitleLength: 160,
  maxTextLength: 2_000,
  maxPathLength: 256,
  maxSessionItemCount: 500,
  supportedSchemaVersions: [1] as const,
} as const;

export const OFFLINE_PRACTICE_MIME_TYPES = {
  content: ["application/json"],
  image: ["image/jpeg", "image/png", "image/webp"],
  claraAudio: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"],
} as const;

export type OfflinePracticeMimeType =
  | (typeof OFFLINE_PRACTICE_MIME_TYPES.content)[number]
  | (typeof OFFLINE_PRACTICE_MIME_TYPES.image)[number]
  | (typeof OFFLINE_PRACTICE_MIME_TYPES.claraAudio)[number];

const MIME_TO_EXTENSION: Record<OfflinePracticeMimeType, string> = {
  "application/json": "json",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export function assetExtensionForMimeType(
  mimeType: OfflinePracticeMimeType,
): string {
  return MIME_TO_EXTENSION[mimeType];
}
