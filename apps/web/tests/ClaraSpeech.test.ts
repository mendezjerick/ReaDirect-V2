import { describe, expect, it, vi } from "vitest";

import { playClaraSpeech } from "../src/features/clara-audio/claraSpeech";

describe("Clara speech playback gate", () => {
  it.each(["loading", "error"] as const)(
    "refuses playback while the model state is %s",
    async (modelState) => {
      await expect(
        playClaraSpeech(new Blob(["wave"]), vi.fn(), { modelState }),
      ).rejects.toThrow(
        "Ma'am Clara must finish loading before speech playback.",
      );
    },
  );
});
