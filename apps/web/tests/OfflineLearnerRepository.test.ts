import { describe, expect, it } from "vitest";

import type {
  OfflineLearnerStoreNativePlugin,
  OfflineLearnerStoreSnapshot,
} from "../src/apk/native/offlineLearnerStoreBridge";
import { OfflineLearnerRepository } from "../src/apk/storage/offlineLearnerRepository";
import {
  acknowledgeOfflineAsr,
  acknowledgeOfflineClara,
  completeOfflineAssessment,
  completeOfflineIntro,
  completeOfflineLesson,
  createInitialOfflineLearnerState,
  getOfflineJourneyStage,
  resetOfflineJourneyProgress,
  saveOfflineLessonCheckpoint,
  skipOfflineDiagnostic,
  updateOfflineLearnerProfile,
  updateOfflineSpeechLanguage,
} from "../src/apk/storage/offlineLearnerState";

const profileId = "5bc9dfb4-8163-4b59-aeab-f510fc2793e3";

class MemoryLearnerStore implements OfflineLearnerStoreNativePlugin {
  failNextSave = false;
  snapshot: OfflineLearnerStoreSnapshot = {
    revision: 0,
    stateJson: null,
    backupRevision: 0,
    backupStateJson: null,
  };

  async load(): Promise<OfflineLearnerStoreSnapshot> {
    return { ...this.snapshot };
  }

  async save(options: { expectedRevision: number; stateJson: string }) {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw Object.assign(new Error("storage full"), {
        code: "LOCAL_PROGRESS_WRITE_FAILED",
      });
    }
    if (this.snapshot.revision !== options.expectedRevision) {
      throw Object.assign(new Error("stale"), {
        code: "LOCAL_PROGRESS_STALE_WRITE",
      });
    }
    const state = JSON.parse(options.stateJson) as { revision: number };
    if (state.revision !== options.expectedRevision + 1) {
      throw new Error("invalid revision");
    }
    if (this.snapshot.stateJson) {
      this.snapshot.backupStateJson = this.snapshot.stateJson;
      this.snapshot.backupRevision = this.snapshot.revision;
    }
    this.snapshot.stateJson = options.stateJson;
    this.snapshot.revision = state.revision;
    return { revision: state.revision };
  }
}

function clock(...timestamps: string[]) {
  let index = 0;
  return () => timestamps[Math.min(index++, timestamps.length - 1)];
}

const times = Array.from({ length: 20 }, (_, index) =>
  new Date(Date.UTC(2026, 7, 16, 1, 0, index)).toISOString(),
);

describe("offline learner repository", () => {
  it("creates one login-free profile and preserves it across app restarts", async () => {
    const storage = new MemoryLearnerStore();
    const firstRepository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    const initial = await firstRepository.initialize();

    expect(initial.profile).toMatchObject({
      id: profileId,
      displayName: "Reader",
    });
    expect(initial.revision).toBe(1);
    expect(getOfflineJourneyStage(initial)).toBe("diagnostic");

    const restartedRepository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => "920a3937-aa9a-474a-b391-d037bdd2052c",
    );
    await expect(restartedRepository.initialize()).resolves.toEqual(initial);
  });

  it("persists checkpoints and profile edits atomically", async () => {
    const storage = new MemoryLearnerStore();
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    await repository.initialize();
    await repository.update((state, now) =>
      completeOfflineAssessment(
        state,
        "diagnostic",
        { score: 18, maximum: 30 },
        now,
      ),
    );
    await repository.update((state, now) =>
      saveOfflineLessonCheckpoint(
        state,
        4,
        {
          currentMissionKey: "mission-4",
          currentItemKey: "lesson-4-item-2",
          completedItemKeys: ["lesson-4-item-1"],
          response: {
            itemKey: "lesson-4-item-1",
            kind: "speech",
            value: "A",
            outcome: "correct",
            attempts: 1,
          },
        },
        now,
      ),
    );
    await repository.update((state, now) =>
      updateOfflineLearnerProfile(state, "Ari", now),
    );

    const restored = await new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    ).read();
    expect(restored.profile.displayName).toBe("Ari");
    expect(restored.journey.lessons[3]).toMatchObject({
      status: "in_progress",
      currentMissionKey: "mission-4",
      currentItemKey: "lesson-4-item-2",
      completedItemKeys: ["lesson-4-item-1"],
    });
    expect(restored.journey.lessons[3].responses[0]).toMatchObject({
      value: "A",
      outcome: "correct",
    });
    expect(getOfflineJourneyStage(restored)).toBe("lesson-4");
  });

  it("unlocks every lesson after the diagnostic while achievements remain independent", async () => {
    const storage = new MemoryLearnerStore();
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    await repository.initialize();

    await expect(
      repository.update((state, now) => completeOfflineLesson(state, 2, now)),
    ).rejects.toThrow("Lesson 2 is still locked");

    let state = await repository.update((current, now) =>
      completeOfflineAssessment(
        current,
        "diagnostic",
        { score: 24, maximum: 30 },
        now,
      ),
    );
    expect(state.journey.achievements.map(({ key }) => key)).toEqual([
      "reading.ready_reader",
    ]);
    expect(state.journey.lessons.map(({ status }) => status)).toEqual(
      Array(6).fill("available"),
    );

    for (const order of [4, 2, 6, 1, 5, 3] as const) {
      state = await repository.update((current, now) =>
        completeOfflineLesson(current, order, now),
      );
      if (order === 4) {
        expect(state.journey.finalAssessment.status).toBe("locked");
      }
    }
    expect(getOfflineJourneyStage(state)).toBe("final-assessment");
    expect(state.journey.finalAssessment.status).toBe("available");
    expect(state.journey.achievements).toHaveLength(7);

    state = await repository.update((current, now) =>
      completeOfflineAssessment(
        current,
        "final",
        { score: 27, maximum: 30 },
        now,
      ),
    );
    expect(getOfflineJourneyStage(state)).toBe("complete");
    expect(state.journey.achievements).toHaveLength(8);
    expect(state.journey.achievements.at(-1)?.key).toBe(
      "reading.readirect_champion",
    );
  });

  it("records a skipped Diagnostic and unlocks every lesson", async () => {
    const storage = new MemoryLearnerStore();
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    await repository.initialize();

    const state = await repository.update((current, now) =>
      skipOfflineDiagnostic(current, 36, now),
    );

    expect(state.journey.diagnostic).toMatchObject({
      status: "completed",
      currentPhase: "skipped",
      score: 0,
      maximum: 36,
    });
    expect(state.journey.lessons.map(({ status }) => status)).toEqual(
      Array(6).fill("available"),
    );
    expect(getOfflineJourneyStage(state)).toBe("lesson-1");
    expect(state.journey.achievements[0]?.key).toBe("reading.ready_reader");
  });

  it("resets only journey progress and preserves setup and profile", async () => {
    const storage = new MemoryLearnerStore();
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    await repository.initialize();
    await repository.update((state, now) =>
      acknowledgeOfflineAsr(state, "medium", now),
    );
    await repository.update((state, now) =>
      acknowledgeOfflineClara(state, "dynamic", now),
    );
    await repository.update(completeOfflineIntro);
    await repository.update((state, now) =>
      completeOfflineAssessment(
        state,
        "diagnostic",
        { score: 28, maximum: 36 },
        now,
      ),
    );
    const progressed = await repository.update((state, now) =>
      completeOfflineLesson(state, 1, now),
    );

    const reset = await repository.update(resetOfflineJourneyProgress);

    expect(reset.profile).toEqual(progressed.profile);
    expect(reset.setup).toEqual(progressed.setup);
    expect(reset.journey).toMatchObject({
      diagnostic: {
        status: "available",
        completedItemKeys: [],
        responses: [],
        score: null,
        maximum: null,
        completedAt: null,
      },
      finalAssessment: { status: "locked" },
      achievements: [],
    });
    expect(reset.journey.lessons.map(({ status }) => status)).toEqual([
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
    expect(getOfflineJourneyStage(reset)).toBe("diagnostic");
  });

  it("restores the last valid backup when the primary record is damaged", async () => {
    const storage = new MemoryLearnerStore();
    const backup = createInitialOfflineLearnerState({
      id: profileId,
      now: times[0],
      revision: 3,
    });
    storage.snapshot = {
      revision: 4,
      stateJson: "{damaged",
      backupRevision: 3,
      backupStateJson: JSON.stringify(backup),
    };
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times.slice(1)),
      () => "920a3937-aa9a-474a-b391-d037bdd2052c",
    );

    const recovered = await repository.initialize();

    expect(recovered.profile.id).toBe(profileId);
    expect(recovered.revision).toBe(5);
    expect(storage.snapshot.revision).toBe(5);
  });

  it("migrates a schema-one learner record before the next atomic write", async () => {
    const storage = new MemoryLearnerStore();
    const current = createInitialOfflineLearnerState({
      id: profileId,
      now: times[0],
      revision: 4,
    });
    storage.snapshot = {
      revision: 4,
      stateJson: JSON.stringify({ ...current, schemaVersion: 1 }),
      backupRevision: 0,
      backupStateJson: null,
    };
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times.slice(1)),
      () => profileId,
    );

    const migrated = await repository.initialize();
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.setup.speechLanguage).toBe("en");
    expect(migrated.revision).toBe(4);

    const saved = await repository.update((state, now) =>
      updateOfflineLearnerProfile(state, "Mia", now),
    );
    expect(saved.schemaVersion).toBe(4);
    expect(JSON.parse(storage.snapshot.stateJson ?? "{}")).toMatchObject({
      schemaVersion: 4,
      revision: 5,
    });
  });

  it("migrates schema-two sequential locks without losing saved progress", async () => {
    const storage = new MemoryLearnerStore();
    const diagnosticComplete = completeOfflineAssessment(
      createInitialOfflineLearnerState({
        id: profileId,
        now: times[0],
        revision: 7,
      }),
      "diagnostic",
      { score: 22, maximum: 30 },
      times[1],
    );
    const legacy = {
      ...diagnosticComplete,
      schemaVersion: 2,
      journey: {
        ...diagnosticComplete.journey,
        lessons: diagnosticComplete.journey.lessons.map((lesson, index) => ({
          ...lesson,
          status: index === 0 ? "available" : "locked",
        })),
      },
    };
    storage.snapshot = {
      revision: 7,
      stateJson: JSON.stringify(legacy),
      backupRevision: 0,
      backupStateJson: null,
    };

    const migrated = await new OfflineLearnerRepository(
      storage,
      clock(...times.slice(2)),
      () => profileId,
    ).initialize();

    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.revision).toBe(7);
    expect(migrated.journey.diagnostic.score).toBe(22);
    expect(migrated.journey.lessons.map(({ status }) => status)).toEqual(
      Array(6).fill("available"),
    );
  });

  it("does not advance progress when Android reports a low-storage write failure", async () => {
    const storage = new MemoryLearnerStore();
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    const initial = await repository.initialize();
    storage.failNextSave = true;

    await expect(
      repository.update((state, now) =>
        completeOfflineAssessment(
          state,
          "diagnostic",
          { score: 24, maximum: 36 },
          now,
        ),
      ),
    ).rejects.toThrow("storage full");

    await expect(repository.read()).resolves.toEqual(initial);
  });

  it("persists ASR before Clara and completes onboarding only after both", async () => {
    const storage = new MemoryLearnerStore();
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    const initial = await repository.initialize();

    expect(() => acknowledgeOfflineClara(initial, "static", times[1])).toThrow(
      "Speech recognition must be acknowledged before Clara",
    );

    const withAsr = await repository.update((state, now) =>
      acknowledgeOfflineAsr(state, "low", now),
    );
    expect(withAsr.setup.onboardingCompletedAt).toBeNull();
    expect(withAsr.setup.asr).toMatchObject({ tier: "low" });

    const completed = await repository.update((state, now) =>
      acknowledgeOfflineClara(state, "static", now),
    );
    expect(completed.setup.onboardingCompletedAt).not.toBeNull();
    expect(completed.setup.clara).toMatchObject({ mode: "static" });

    const withIntro = await repository.update(completeOfflineIntro);
    expect(withIntro.setup.introCompletedAt).not.toBeNull();
  });

  it("persists Clara's offline speech language without resetting progress", async () => {
    const storage = new MemoryLearnerStore();
    const repository = new OfflineLearnerRepository(
      storage,
      clock(...times),
      () => profileId,
    );
    await repository.initialize();
    const updated = await repository.update((state, now) =>
      updateOfflineSpeechLanguage(state, "fil-PH", now),
    );

    expect(updated.setup.speechLanguage).toBe("fil-PH");
    expect(updated.journey.diagnostic.status).toBe("available");
    await expect(repository.read()).resolves.toMatchObject({
      setup: { speechLanguage: "fil-PH" },
    });
  });
});
