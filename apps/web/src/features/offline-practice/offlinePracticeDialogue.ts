import type {
  OfflineContentDocument,
  OfflineDialogue,
  OfflineLanguage,
  OfflinePracticeItem,
} from "./offlinePracticeSchemas";

export interface OfflineDialogueSelection {
  readonly dialogue: OfflineDialogue;
  readonly language: OfflineLanguage;
  readonly audioAssetId: string | null;
}

export function selectOfflineDialogue(
  content: OfflineContentDocument,
  item: OfflinePracticeItem,
  language: OfflineLanguage,
): OfflineDialogueSelection {
  const dialogue = item.dialogueKeys
    .map((key) =>
      content.dialogues.find((candidate) => candidate.dialogueKey === key),
    )
    .find((candidate) => candidate?.language === language);

  if (!dialogue) {
    throw new Error(
      `This practice pack has no ${language} Clara dialogue for the item.`,
    );
  }

  return {
    dialogue,
    language,
    audioAssetId: dialogue.localAudioAssetId ?? null,
  };
}
