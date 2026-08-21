import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssessmentRecorder } from "../src/features/assessment/AssessmentRecorder";
import type { useAudioRecorder } from "../src/features/assessment/useAudioRecorder";

function idleRecorder(): ReturnType<typeof useAudioRecorder> {
  return {
    state: "idle",
    audio: null,
    hasPlayed: false,
    error: "",
    recordingElapsedMs: 0,
    record: vi.fn(),
    stop: vi.fn(),
    stopPlayback: vi.fn(),
    play: vi.fn(),
    retry: vi.fn(),
    discard: vi.fn(),
  };
}

describe("AssessmentRecorder", () => {
  it("uses the recorder's own pixel ring instead of a microphone glyph", () => {
    const { container } = render(
      <AssessmentRecorder
        recorder={idleRecorder()}
        unavailable={false}
        onAudioAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    expect(
      container.querySelector('[data-pixel-icon="microphone"]'),
    ).toBeNull();
    expect(
      container.querySelector(".assessment-recorder__record-mark"),
    ).toBeInTheDocument();
  });
});
