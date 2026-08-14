import { describe, expect, it } from "vitest";

import { audioFilename } from "../src/lib/audioFile";

describe("audioFilename", () => {
  it("uses an extension matching the recorded Blob type", () => {
    expect(
      audioFilename("letter-a", new Blob(["audio"], { type: "audio/webm" })),
    ).toBe("letter-a.webm");
    expect(
      audioFilename("letter-a", new Blob(["audio"], { type: "audio/mp4" })),
    ).toBe("letter-a.m4a");
    expect(
      audioFilename("passage", new Blob(["audio"], { type: "audio/ogg" })),
    ).toBe("passage.ogg");
  });
});
