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
  updateOfflineSpeechLanguage,
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
  it("requires playback before submitting speech to native ASR", async () => {
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
      stopRecording: vi.fn().mockResolvedValue({
        sampleCount: 16_000,
        audioDurationMs: 1_000,
      }),
      playRecording: vi.fn().mockResolvedValue({
        audioDurationMs: 1_000,
        completed: true as const,
      }),
      transcribeRecording: vi.fn().mockResolvedValue({
        transcript: "A",
        tier: "medium" as const,
        sampleCount: 16_000,
        audioDurationMs: 1_000,
        inferenceDurationMs: 400,
      }),
      clearRecording: vi.fn().mockResolvedValue(undefined),
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

    expect(
      screen.getByRole("button", { name: "Back to Reading Journey" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Record answer" }));
    expect(asr.startRecording).toHaveBeenCalledWith(30_000, {
      expectedTranscript: "A",
    });
    expect(screen.getByRole("button", { name: "Stop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Stop" }));

    expect(await screen.findByRole("button", { name: "Play" })).toBeEnabled();
    expect((await repository.read()).journey.diagnostic.responses).toHaveLength(
      0,
    );
    expect(onLearnerChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(await screen.findByRole("button", { name: "Retry?" })).toBeEnabled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.getAllByRole("status")[0]).toHaveTextContent(
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
    expect(asr.stopRecording).toHaveBeenCalledOnce();
    expect(asr.playRecording).toHaveBeenCalledOnce();
    expect(asr.transcribeRecording).toHaveBeenCalledOnce();
    expect(asr.stopAndTranscribe).not.toHaveBeenCalled();
  });

  it("automatically plays Clara's packaged prompt in the saved language", async () => {
    const learner = updateOfflineSpeechLanguage(
      createInitialOfflineLearnerState({
        id: profileId,
        now: "2026-08-17T01:00:00.000Z",
      }),
      "fil-PH",
      "2026-08-17T01:01:00.000Z",
    );
    const asr = {
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playRecording: vi.fn(),
      transcribeRecording: vi.fn(),
      clearRecording: vi.fn().mockResolvedValue(undefined),
      stopAndTranscribe: vi.fn(),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn().mockResolvedValue({
        key: "assessment-letters",
        language: "fil-PH" as const,
        durationMs: 1_000,
        completed: true as const,
      }),
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

    await waitFor(() =>
      expect(tts.play).toHaveBeenCalledWith("assessment-letters", "fil-PH"),
    );
    expect(
      screen.queryByRole("button", { name: "Listen to Clara" }),
    ).not.toBeInTheDocument();
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
      stopRecording: vi.fn(),
      playRecording: vi.fn(),
      transcribeRecording: vi.fn(),
      clearRecording: vi.fn().mockResolvedValue(undefined),
      stopAndTranscribe: vi.fn(),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn(async (key, language) => ({
        key,
        language,
        durationMs: 1_000,
        completed: true as const,
      })),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    const rendered = render(
      <OfflineJourneyActivity
        learner={learner}
        stage="lesson-5"
        asr={asr}
        tts={tts}
        onLearnerChange={() => undefined}
        onExit={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Record answer" }));
    expect(asr.startRecording).toHaveBeenCalledWith(60_000, {
      expectedTranscript:
        "mila goes to the school on tuesday and she takes a book to read she holds the book opens it reads it and looks at it mila reads from the book then she sits rests and reads again she likes to read and she stays at the school on tuesday",
    });

    rendered.unmount();
    expect(asr.cancelRecording).toHaveBeenCalledOnce();
    expect(tts.stop).toHaveBeenCalledTimes(3);
  });

  it("resumes a selected lesson at the first unfinished item after restart", async () => {
    const user = userEvent.setup();
    const repository = new OfflineLearnerRepository(
      new MemoryLearnerStore(),
      () => "2026-08-17T01:00:00.000Z",
      () => profileId,
    );
    await repository.initialize();
    const learner = await repository.update((state, now) =>
      completeOfflineAssessment(
        state,
        "diagnostic",
        { score: 24, maximum: 30 },
        now,
      ),
    );
    const asr = {
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      playRecording: vi.fn(),
      transcribeRecording: vi.fn(),
      clearRecording: vi.fn().mockResolvedValue(undefined),
      stopAndTranscribe: vi.fn(),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn(async (key, language) => ({
        key,
        language,
        durationMs: 1_000,
        completed: true as const,
      })),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    const firstRun = render(
      <OfflineJourneyActivity
        learner={learner}
        stage="lesson-2"
        repository={repository}
        asr={asr}
        tts={tts}
        onLearnerChange={() => undefined}
        onExit={() => undefined}
      />,
    );
    expect(screen.getByLabelText("Item 1 of 10")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText("Skipped. You can keep moving.");
    firstRun.unmount();

    const restored = await repository.read();
    expect(restored.journey.lessons[1].status).toBe("in_progress");
    expect(restored.journey.lessons[1].completedItemKeys).toHaveLength(1);
    expect(restored.journey.lessons[1].responses).toHaveLength(1);

    render(
      <OfflineJourneyActivity
        learner={restored}
        stage="lesson-2"
        repository={repository}
        asr={asr}
        tts={tts}
        onLearnerChange={() => undefined}
        onExit={() => undefined}
      />,
    );
    expect(screen.getByLabelText("Item 2 of 10")).toBeInTheDocument();
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
      stopRecording: vi.fn().mockResolvedValue({
        sampleCount: 16_000,
        audioDurationMs: 1_000,
      }),
      playRecording: vi.fn().mockResolvedValue({
        audioDurationMs: 1_000,
        completed: true as const,
      }),
      transcribeRecording: vi
        .fn()
        .mockRejectedValue(new Error("The microphone disconnected.")),
      clearRecording: vi.fn().mockResolvedValue(undefined),
      stopAndTranscribe: vi.fn(),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn(async (key, language) => ({
        key,
        language,
        durationMs: 1_000,
        completed: true as const,
      })),
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
    await user.click(screen.getByRole("button", { name: "Stop" }));
    await user.click(await screen.findByRole("button", { name: "Play" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The microphone disconnected.",
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
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
      stopRecording: vi.fn(),
      playRecording: vi.fn(),
      transcribeRecording: vi.fn(),
      clearRecording: vi.fn().mockResolvedValue(undefined),
      stopAndTranscribe: vi.fn(),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    };
    const tts = {
      play: vi.fn(async (key, language) => ({
        key,
        language,
        durationMs: 1_000,
        completed: true as const,
      })),
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
