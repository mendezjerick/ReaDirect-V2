const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const baseManifest = {
  schemaVersion: 1,
  packId: "letters-foundations-v1",
  version: "2026.08.1",
  moduleKey: "letters",
  title: "Letter Practice",
  minimumAppVersion: "1.0.0",
  academicContentLanguage: "en",
  supportedLanguages: ["en", "fil"],
  availableClaraLanguages: ["en", "fil"],
  content: {
    relativeApiPath:
      "/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.1/content",
    mimeType: "application/json",
    byteCount: 2_048,
    sha256: HASH_A,
  },
  assets: [
    {
      assetId: "clara-welcome-en",
      kind: "clara_audio",
      language: "en",
      mimeType: "audio/wav",
      byteCount: 64_000,
      sha256: HASH_A,
      relativeApiPath:
        "/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.1/assets/clara-welcome-en",
    },
    {
      assetId: "clara-welcome-fil",
      kind: "clara_audio",
      language: "fil",
      mimeType: "audio/wav",
      byteCount: 64_000,
      sha256: HASH_B,
      relativeApiPath:
        "/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.1/assets/clara-welcome-fil",
    },
    {
      assetId: "clara-mascot",
      kind: "image",
      mimeType: "image/webp",
      byteCount: 32_000,
      sha256: HASH_B,
      relativeApiPath:
        "/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.1/assets/clara-mascot",
    },
  ],
  totalBytes: 162_048,
  manifestSha256: HASH_A,
  createdAt: "2026-08-10T00:00:00Z",
  updatedAt: "2026-08-10T00:00:00Z",
};

const bilingualDialogues = [
  {
    dialogueKey: "letter-read-en",
    language: "en",
    text: "Let us practice this letter together.",
    fixedSpeechKey: "offline-letter-read-en",
    localAudioAssetId: "clara-welcome-en",
  },
  {
    dialogueKey: "letter-read-fil",
    language: "fil",
    text: "Sabay nating sanayin ang letrang ito.",
    fixedSpeechKey: "offline-letter-read-fil",
    localAudioAssetId: "clara-welcome-fil",
  },
];

const letterItem = {
  practiceItemId: "letter-f",
  interactionMode: "letter_read",
  displayText: "F",
  dialogueKeys: ["letter-read-en", "letter-read-fil"],
  assetIds: ["clara-mascot"],
};

export const validLetterPracticePack = {
  manifest: baseManifest,
  content: {
    schemaVersion: 1,
    packId: "letters-foundations-v1",
    version: "2026.08.1",
    dialogues: bilingualDialogues,
    modules: [
      {
        moduleKey: "letters",
        title: "Letter Practice",
        items: [letterItem],
      },
    ],
  },
};

export const validBilingualClaraDialogue = bilingualDialogues;

export const validComprehensionPractice = {
  ...validLetterPracticePack,
  content: {
    ...validLetterPracticePack.content,
    modules: [
      {
        moduleKey: "letters",
        title: "Letter Practice",
        items: [
          {
            ...letterItem,
            practiceItemId: "letter-f-question",
            interactionMode: "comprehension_choice",
            comprehension: {
              choices: [
                { choiceId: "choice-f", label: "F" },
                { choiceId: "choice-m", label: "M" },
              ],
              correctChoiceId: "choice-f",
              feedbackText: "The letter card shows F.",
            },
          },
        ],
      },
    ],
  },
};

export const validOptionalAudioFallback = {
  manifest: {
    ...baseManifest,
    assets: [baseManifest.assets[2]],
    totalBytes: 34_048,
  },
  content: {
    ...validLetterPracticePack.content,
    dialogues: bilingualDialogues.map(
      ({ fixedSpeechKey, localAudioAssetId, ...dialogue }) => dialogue,
    ),
  },
};

export const invalidPathTraversalPack = {
  ...validLetterPracticePack,
  manifest: {
    ...baseManifest,
    assets: [{ ...baseManifest.assets[2], assetId: "../clara-mascot" }],
  },
};

export const invalidUnknownInteractionPack = {
  ...validLetterPracticePack,
  content: {
    ...validLetterPracticePack.content,
    modules: [
      {
        ...validLetterPracticePack.content.modules[0],
        items: [{ ...letterItem, interactionMode: "run_server_instruction" }],
      },
    ],
  },
};

export const invalidSchemaVersionPack = {
  ...validLetterPracticePack,
  manifest: { ...baseManifest, schemaVersion: 99 },
};

export const invalidOversizedManifestPack = {
  ...validLetterPracticePack,
  manifest: { ...baseManifest, totalBytes: 60 * 1024 * 1024 },
};

export const invalidMimePack = {
  ...validLetterPracticePack,
  manifest: {
    ...baseManifest,
    assets: [{ ...baseManifest.assets[2], mimeType: "text/html" }],
  },
};

export const invalidSha256Pack = {
  ...validLetterPracticePack,
  manifest: { ...baseManifest, manifestSha256: "not-a-hash" },
};

export const invalidMissingContentPack = {
  manifest: baseManifest,
  content: {
    ...validLetterPracticePack.content,
    modules: [],
  },
};

export const invalidAcademicFieldPack = {
  ...validLetterPracticePack,
  content: {
    ...validLetterPracticePack.content,
    modules: [
      {
        ...validLetterPracticePack.content.modules[0],
        items: [{ ...letterItem, score: 100 }],
      },
    ],
  },
};

export const invalidCanonicalIdentifierPack = {
  ...validLetterPracticePack,
  content: {
    ...validLetterPracticePack.content,
    modules: [
      {
        ...validLetterPracticePack.content.modules[0],
        items: [{ ...letterItem, lesson_run_id: "run-1" }],
      },
    ],
  },
};

export const invalidWrongLanguageDialoguePack = {
  ...validLetterPracticePack,
  content: {
    ...validLetterPracticePack.content,
    dialogues: bilingualDialogues.map((dialogue) =>
      dialogue.dialogueKey === "letter-read-fil"
        ? { ...dialogue, localAudioAssetId: "clara-welcome-en" }
        : dialogue,
    ),
  },
};
