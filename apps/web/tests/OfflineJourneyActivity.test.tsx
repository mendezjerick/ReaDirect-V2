import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OfflineJourneyActivity } from "../src/apk/activity/OfflineJourneyActivity";
import type {
  OfflineLearnerStoreNativePlugin,
  OfflineLearnerStoreSnapshot,
} from "../src/apk/native/offlineLearnerStoreBridge";
import { OfflineLearnerRepository } from "../src/apk/storage/offlineLearnerRepository";
import {
  completeOfflineAssessment,
  completeOfflineLesson,
  createInitialOfflineLearnerState,
} from "../src/apk/storage/offlineLearnerState";

const profileId = "5bc9dfb4-8163-4b59-aeab-f510fc2793e3";

class MemoryLearnerStore implements OfflineLearnerStoreNativePlugin {
  snapshot: OfflineLearnerStoreSnapshot = {
    revision: 0,
    stateJson: null,
    backupRevision: 0,
    backupStateJson: null,
  };

  async load() {
    return { ...this.snapshot };
  }

  async save(options: { expectedRevision: number; stateJson: string }) {
    const state = JSON.parse(options.stateJson) as { revision: number };
    this.snapshot.stateJson = options.stateJson;
    this.snapshot.revision = state.revision;
    return { revision: state.revision };
  }
}

describe("offline journey activity", () => {
  it("records speech with native ASR and saves the result locally", async () => {
    const user = userEvent.setup();
    const repository = new OfflineLearnerRepository(
      new MemoryLearnerStore(),
      () => "2026-08-17T01:00:00.000Z",
      () => profileId,
    );
    const learner = await repository.initialize();
    const onLearnerChange = vi.fn();
    const asr = {
      startRecording: vi.fn().mockResolvedValue({
        sampleRateHz: 16_000 as const,
        maxDurationMs: 30_000,
      }),
      stopAndTranscribe: vi.fn().mockResolvedValue({
        transcript: "A",
        tier: "medium" as const,
        sampleCount: 16_000,
        audioDurationMs: 1_000,
        inferenceDurationMs: 400,
      }),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn().mockResolvedValue({
        key: "assessment-letters",
        durationMs: 1_000,
        completed: true as const,
      }),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <OfflineJourneyActivity
        learner={learner}
        repository={repository}
        asr={asr}
        tts={tts}
        onLearnerChange={onLearnerChange}
        onExit={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Record answer" }));
    expect(asr.startRecording).toHaveBeenCalledWith(30_000);
    expect(
      screen.getByRole("button", { name: "Stop and check" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Stop and check" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Correct — nicely done!",
      ),
    );
    expect(screen.getByText("You said: “A”")).toBeInTheDocument();
    const saved = await repository.read();
    expect(saved.journey.diagnostic).toMatchObject({
      status: "in_progress",
      completedItemKeys: ["diagnostic-task-1a-01"],
    });
    expect(saved.journey.diagnostic.responses[0]).toMatchObject({
      itemKey: "diagnostic-task-1a-01",
      kind: "speech",
      value: "A",
      outcome: "correct",
      attempts: 1,
    });
    expect(onLearnerChange).toHaveBeenCalledOnce();
  });

  it("allows a 60-second passage recording and cancels capture on unmount", async () => {
    const user = userEvent.setup();
    let learner = createInitialOfflineLearnerState({
      id: profileId,
      now: "2026-08-17T01:00:00.000Z",
    });
    learner = completeOfflineAssessment(
      learner,
      "diagnostic",
      { score: 30, maximum: 36 },
      "2026-08-17T01:01:00.000Z",
    );
    for (const order of [1, 2, 3, 4] as const) {
      learner = completeOfflineLesson(
        learner,
        order,
        `2026-08-17T01:0${order + 1}:00.000Z`,
      );
    }
    const asr = {
      startRecording: vi.fn().mockResolvedValue({
        sampleRateHz: 16_000 as const,
        maxDurationMs: 60_000,
      }),
      stopAndTranscribe: vi.fn(),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    const rendered = render(
      <OfflineJourneyActivity
        learner={learner}
        asr={asr}
        tts={tts}
        onLearnerChange={() => undefined}
        onExit={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Record answer" }));
    expect(asr.startRecording).toHaveBeenCalledWith(60_000);

    rendered.unmount();
    expect(asr.cancelRecording).toHaveBeenCalledOnce();
    expect(tts.stop).toHaveBeenCalledTimes(2);
  });

  it("returns to a usable state when recording or transcription fails", async () => {
    const user = userEvent.setup();
    const learner = createInitialOfflineLearnerState({
      id: profileId,
      now: "2026-08-17T01:00:00.000Z",
    });
    const asr = {
      startRecording: vi.fn().mockResolvedValue({
        sampleRateHz: 16_000 as const,
        maxDurationMs: 30_000,
      }),
      stopAndTranscribe: vi
        .fn()
        .mockRejectedValue(new Error("The microphone disconnected.")),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const onLearnerChange = vi.fn();

    render(
      <OfflineJourneyActivity
        learner={learner}
        asr={asr}
        tts={tts}
        onLearnerChange={onLearnerChange}
        onExit={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Record answer" }));
    await user.click(screen.getByRole("button", { name: "Stop and check" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The microphone disconnected.",
    );
    expect(screen.getByRole("button", { name: "Record answer" })).toBeEnabled();
    expect(onLearnerChange).not.toHaveBeenCalled();
  });

  it("stops private microphone capture when the app enters the background", async () => {
    const user = userEvent.setup();
    const learner = createInitialOfflineLearnerState({
      id: profileId,
      now: "2026-08-17T01:00:00.000Z",
    });
    const asr = {
      startRecording: vi.fn().mockResolvedValue({
        sampleRateHz: 16_000 as const,
        maxDurationMs: 30_000,
      }),
      stopAndTranscribe: vi.fn(),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <OfflineJourneyActivity
        learner={learner}
        asr={asr}
        tts={tts}
        onLearnerChange={() => undefined}
        onExit={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Record answer" }));

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(
      await screen.findByText(/Recording stopped when ReaDirect moved/i),
    ).toBeInTheDocument();
    expect(asr.cancelRecording).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Record answer" })).toBeEnabled();

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });
});
