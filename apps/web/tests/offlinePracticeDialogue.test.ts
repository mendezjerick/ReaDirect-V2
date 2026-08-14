import { describe, expect, it } from "vitest";

import { selectOfflineDialogue } from "../src/features/offline-practice/offlinePracticeDialogue";
import type {
  OfflineContentDocument,
  OfflinePracticeItem,
} from "../src/features/offline-practice/offlinePracticeSchemas";
import { validLetterPracticePack } from "./fixtures/offlinePracticeFixtures";

describe("offline dialogue selection", () => {
  it("selects text and audio from the same language variant", () => {
    const content =
      validLetterPracticePack.content as unknown as OfflineContentDocument;
    const item = content.modules[0].items[0] as OfflinePracticeItem;
    const selected = selectOfflineDialogue(content, item, "fil");

    expect(selected.dialogue.text).toBe(
      "Sabay nating sanayin ang letrang ito.",
    );
    expect(selected.audioAssetId).toBe("clara-welcome-fil");
  });

  it("keeps the selected-language text silent when its optional audio is absent", () => {
    const pack = {
      ...validLetterPracticePack,
      content: {
        ...validLetterPracticePack.content,
        dialogues: validLetterPracticePack.content.dialogues.map(
          (dialogue) => ({
            ...dialogue,
            fixedSpeechKey: undefined,
            localAudioAssetId: undefined,
          }),
        ),
      },
    };
    const content = pack.content as unknown as OfflineContentDocument;
    const selected = selectOfflineDialogue(
      content,
      content.modules[0].items[0] as OfflinePracticeItem,
      "fil",
    );

    expect(selected.dialogue.text).toBe(
      "Sabay nating sanayin ang letrang ito.",
    );
    expect(selected.audioAssetId).toBeNull();
  });
});
