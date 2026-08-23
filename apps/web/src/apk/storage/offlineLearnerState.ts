import { z } from "zod";

export const CURRENT_OFFLINE_LEARNER_SCHEMA_VERSION = 4 as const;

export const offlineAchievementKeys = [
  "reading.ready_reader",
  "reading.letter_leader",
  "reading.word_wizard",
  "reading.phrase_pro",
  "reading.sentence_star",
  "reading.passage_explorer",
  "reading.question_detective",
  "reading.readirect_champion",
] as const;

const timestampSchema = z.string().datetime({ offset: true });
const activityStatusSchema = z.enum([
  "locked",
  "available",
  "in_progress",
  "completed",
]);
const responseSchema = z.object({
  itemKey: z.string().min(1).max(160),
  kind: z.enum(["speech", "choice", "skipped"]),
  value: z.string().max(4_000).nullable(),
  outcome: z
    .enum(["correct", "needs_support", "unscorable", "skipped"])
    .nullable(),
  attempts: z.number().int().min(0).max(100),
  updatedAt: timestampSchema,
});

const assessmentProgressSchema = z.object({
  status: activityStatusSchema,
  currentPhase: z.string().min(1).max(80).nullable(),
  currentItemKey: z.string().min(1).max(160).nullable(),
  completedItemKeys: z.array(z.string().min(1).max(160)),
  responses: z.array(responseSchema),
  score: z.number().int().nonnegative().nullable(),
  maximum: z.number().int().positive().nullable(),
  completedAt: timestampSchema.nullable(),
});

const lessonProgressSchema = z.object({
  order: z.number().int().min(1).max(6),
  status: activityStatusSchema,
  currentMissionKey: z.string().min(1).max(80).nullable(),
  currentItemKey: z.string().min(1).max(160).nullable(),
  completedItemKeys: z.array(z.string().min(1).max(160)),
  responses: z.array(responseSchema),
  completedAt: timestampSchema.nullable(),
});

const achievementSchema = z.object({
  key: z.enum(offlineAchievementKeys),
  unlockedAt: timestampSchema,
  seenAt: timestampSchema.nullable(),
});

export const offlineLearnerStateSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_OFFLINE_LEARNER_SCHEMA_VERSION),
    revision: z.number().int().positive(),
    profile: z.object({
      id: z.string().uuid(),
      displayName: z.string().trim().min(1).max(50),
      createdAt: timestampSchema,
      updatedAt: timestampSchema,
    }),
    setup: z.object({
      onboardingCompletedAt: timestampSchema.nullable(),
      introCompletedAt: timestampSchema.nullable(),
      speechLanguage: z.enum(["en", "fil-PH"]),
      asr: z.object({
        tier: z.enum(["low", "medium", "high"]).nullable(),
        acknowledgedAt: timestampSchema.nullable(),
      }),
      clara: z.object({
        mode: z.enum(["static", "dynamic"]).nullable(),
        acknowledgedAt: timestampSchema.nullable(),
      }),
    }),
    journey: z.object({
      diagnostic: assessmentProgressSchema,
      lessons: z.array(lessonProgressSchema).length(6),
      finalAssessment: assessmentProgressSchema,
      achievements: z.array(achievementSchema),
      updatedAt: timestampSchema,
    }),
  })
  .superRefine((state, context) => {
    if (
      (state.setup.asr.acknowledgedAt !== null &&
        state.setup.asr.tier === null) ||
      (state.setup.clara.acknowledgedAt !== null &&
        state.setup.clara.mode === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["setup"],
        message: "Acknowledged device modes require a stored selection.",
      });
    }
    if (
      state.setup.clara.acknowledgedAt !== null &&
      state.setup.asr.acknowledgedAt === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["setup", "clara", "acknowledgedAt"],
        message: "ASR must be acknowledged before Clara.",
      });
    }
    if (
      state.setup.onboardingCompletedAt !== null &&
      (state.setup.asr.acknowledgedAt === null ||
        state.setup.clara.acknowledgedAt === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["setup", "onboardingCompletedAt"],
        message: "Onboarding requires both device acknowledgements.",
      });
    }

    const assessments = [
      ["diagnostic", state.journey.diagnostic],
      ["finalAssessment", state.journey.finalAssessment],
    ] as const;
    for (const [name, assessment] of assessments) {
      const completed = assessment.status === "completed";
      if (
        completed !==
        (assessment.completedAt !== null &&
          assessment.score !== null &&
          assessment.maximum !== null)
      ) {
        context.addIssue({
          code: "custom",
          path: ["journey", name],
          message: "Completed assessments require a score and completion time.",
        });
      }
      if (
        assessment.score !== null &&
        assessment.maximum !== null &&
        assessment.score > assessment.maximum
      ) {
        context.addIssue({
          code: "custom",
          path: ["journey", name, "score"],
          message: "Assessment score cannot exceed its maximum.",
        });
      }
      if (
        new Set(assessment.completedItemKeys).size !==
          assessment.completedItemKeys.length ||
        new Set(assessment.responses.map(({ itemKey }) => itemKey)).size !==
          assessment.responses.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["journey", name],
          message: "Assessment item progress must not contain duplicates.",
        });
      }
    }

    const orders = state.journey.lessons.map(({ order }) => order);
    if (orders.some((order, index) => order !== index + 1)) {
      context.addIssue({
        code: "custom",
        path: ["journey", "lessons"],
        message: "Lessons must be stored once in Reading Journey order.",
      });
    }

    const diagnosticComplete = state.journey.diagnostic.status === "completed";
    for (const [index, lesson] of state.journey.lessons.entries()) {
      const isCompleted = lesson.status === "completed";
      if (isCompleted !== (lesson.completedAt !== null)) {
        context.addIssue({
          code: "custom",
          path: ["journey", "lessons", index, "completedAt"],
          message: "Completed lessons require a completion time.",
        });
      }
      if (
        new Set(lesson.completedItemKeys).size !==
          lesson.completedItemKeys.length ||
        new Set(lesson.responses.map(({ itemKey }) => itemKey)).size !==
          lesson.responses.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["journey", "lessons", index],
          message: "Lesson item progress must not contain duplicates.",
        });
      }
      if (!diagnosticComplete && lesson.status !== "locked") {
        context.addIssue({
          code: "custom",
          path: ["journey", "lessons", index, "status"],
          message: "Lessons remain locked until the diagnostic is complete.",
        });
      }
      if (diagnosticComplete && lesson.status === "locked") {
        context.addIssue({
          code: "custom",
          path: ["journey", "lessons", index, "status"],
          message: "All lessons must be available after the diagnostic.",
        });
      }
    }

    const allLessonsComplete = state.journey.lessons.every(
      ({ status }) => status === "completed",
    );
    if (
      (!allLessonsComplete &&
        state.journey.finalAssessment.status !== "locked") ||
      (allLessonsComplete && state.journey.finalAssessment.status === "locked")
    ) {
      context.addIssue({
        code: "custom",
        path: ["journey", "finalAssessment", "status"],
        message:
          "Final assessment availability must follow Lesson 6 completion.",
      });
    }

    const achievementKeys = state.journey.achievements.map(({ key }) => key);
    if (new Set(achievementKeys).size !== achievementKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["journey", "achievements"],
        message: "An achievement can be unlocked only once.",
      });
    }

    const expectedKeys: string[] = [];
    if (diagnosticComplete) expectedKeys.push(offlineAchievementKeys[0]);
    for (const lesson of state.journey.lessons) {
      if (lesson.status === "completed") {
        expectedKeys.push(offlineAchievementKeys[lesson.order]);
      }
    }
    if (state.journey.finalAssessment.status === "completed") {
      expectedKeys.push(offlineAchievementKeys[7]);
    }
    if (
      expectedKeys.length !== achievementKeys.length ||
      expectedKeys.some((key) => !achievementKeys.includes(key as never))
    ) {
      context.addIssue({
        code: "custom",
        path: ["journey", "achievements"],
        message:
          "Achievements must match completed Reading Journey activities.",
      });
    }
  });

export type OfflineLearnerState = z.infer<typeof offlineLearnerStateSchema>;
export type OfflineActivityResponse = z.infer<typeof responseSchema>;
export type OfflineJourneyStage =
  | "diagnostic"
  | `lesson-${1 | 2 | 3 | 4 | 5 | 6}`
  | "final-assessment"
  | "complete";

export type OfflineActivityCheckpoint = {
  currentPhase?: string | null;
  currentMissionKey?: string | null;
  currentItemKey: string | null;
  completedItemKeys: string[];
  response?: Omit<OfflineActivityResponse, "updatedAt">;
};

export function migrateOfflineLearnerState(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;

  const stored = input as Record<string, unknown>;
  if (
    stored.schemaVersion !== 1 &&
    stored.schemaVersion !== 2 &&
    stored.schemaVersion !== 3
  ) {
    return input;
  }

  const journey =
    typeof stored.journey === "object" && stored.journey !== null
      ? (stored.journey as Record<string, unknown>)
      : null;
  const diagnostic =
    journey &&
    typeof journey.diagnostic === "object" &&
    journey.diagnostic !== null
      ? (journey.diagnostic as Record<string, unknown>)
      : null;
  const lessons =
    journey && Array.isArray(journey.lessons)
      ? journey.lessons.map((lesson) =>
          diagnostic?.status === "completed" &&
          typeof lesson === "object" &&
          lesson !== null &&
          (lesson as Record<string, unknown>).status === "locked"
            ? { ...(lesson as Record<string, unknown>), status: "available" }
            : lesson,
        )
      : journey?.lessons;

  return {
    ...stored,
    schemaVersion: CURRENT_OFFLINE_LEARNER_SCHEMA_VERSION,
    setup:
      typeof stored.setup === "object" && stored.setup !== null
        ? {
            ...(stored.setup as Record<string, unknown>),
            speechLanguage:
              (stored.setup as Record<string, unknown>).speechLanguage ===
              "fil-PH"
                ? "fil-PH"
                : "en",
          }
        : stored.setup,
    ...(journey ? { journey: { ...journey, lessons } } : {}),
  };
}

function emptyAssessment(status: "locked" | "available") {
  return {
    status,
    currentPhase: null,
    currentItemKey: null,
    completedItemKeys: [],
    responses: [],
    score: null,
    maximum: null,
    completedAt: null,
  };
}

function emptyJourney(now: string) {
  return {
    diagnostic: emptyAssessment("available"),
    lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
      order,
      status: "locked" as const,
      currentMissionKey: null,
      currentItemKey: null,
      completedItemKeys: [],
      responses: [],
      completedAt: null,
    })),
    finalAssessment: emptyAssessment("locked"),
    achievements: [],
    updatedAt: now,
  };
}

function cloneState(state: OfflineLearnerState): OfflineLearnerState {
  return JSON.parse(JSON.stringify(state)) as OfflineLearnerState;
}

export function createInitialOfflineLearnerState(options: {
  id: string;
  now: string;
  revision?: number;
}): OfflineLearnerState {
  return offlineLearnerStateSchema.parse({
    schemaVersion: CURRENT_OFFLINE_LEARNER_SCHEMA_VERSION,
    revision: options.revision ?? 1,
    profile: {
      id: options.id,
      displayName: "Reader",
      createdAt: options.now,
      updatedAt: options.now,
    },
    setup: {
      onboardingCompletedAt: null,
      introCompletedAt: null,
      speechLanguage: "en",
      asr: { tier: null, acknowledgedAt: null },
      clara: { mode: null, acknowledgedAt: null },
    },
    journey: emptyJourney(options.now),
  });
}

export function resetOfflineJourneyProgress(
  state: OfflineLearnerState,
  now: string,
): OfflineLearnerState {
  const next = cloneState(state);
  next.journey = emptyJourney(now);
  return offlineLearnerStateSchema.parse(next);
}

export function getOfflineJourneyStage(
  state: OfflineLearnerState,
): OfflineJourneyStage {
  if (state.journey.diagnostic.status !== "completed") return "diagnostic";
  const inProgressLesson = state.journey.lessons.find(
    ({ status }) => status === "in_progress",
  );
  if (inProgressLesson) {
    return `lesson-${inProgressLesson.order}` as OfflineJourneyStage;
  }
  const nextLesson = state.journey.lessons.find(
    ({ status }) => status === "available",
  );
  if (nextLesson) return `lesson-${nextLesson.order}` as OfflineJourneyStage;
  if (state.journey.finalAssessment.status !== "completed") {
    return "final-assessment";
  }
  return "complete";
}

function mergeResponse(
  responses: OfflineActivityResponse[],
  response: Omit<OfflineActivityResponse, "updatedAt"> | undefined,
  now: string,
): OfflineActivityResponse[] {
  if (!response) return responses;
  return [
    ...responses.filter(({ itemKey }) => itemKey !== response.itemKey),
    { ...response, updatedAt: now },
  ];
}

function unlockAchievement(
  state: OfflineLearnerState,
  key: (typeof offlineAchievementKeys)[number],
  now: string,
) {
  if (
    !state.journey.achievements.some((achievement) => achievement.key === key)
  ) {
    state.journey.achievements.push({ key, unlockedAt: now, seenAt: null });
  }
}

function unlockAllLessons(state: OfflineLearnerState) {
  for (const lesson of state.journey.lessons) {
    if (lesson.status === "locked") lesson.status = "available";
  }
}

export function saveOfflineAssessmentCheckpoint(
  state: OfflineLearnerState,
  assessment: "diagnostic" | "final",
  checkpoint: OfflineActivityCheckpoint,
  now: string,
): OfflineLearnerState {
  const next = cloneState(state);
  const progress =
    assessment === "diagnostic"
      ? next.journey.diagnostic
      : next.journey.finalAssessment;
  if (progress.status === "locked" || progress.status === "completed") {
    throw new Error(
      `The ${assessment} assessment cannot accept a checkpoint now.`,
    );
  }
  progress.status = "in_progress";
  progress.currentPhase = checkpoint.currentPhase ?? progress.currentPhase;
  progress.currentItemKey = checkpoint.currentItemKey;
  progress.completedItemKeys = [...new Set(checkpoint.completedItemKeys)];
  progress.responses = mergeResponse(
    progress.responses,
    checkpoint.response,
    now,
  );
  next.journey.updatedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function completeOfflineAssessment(
  state: OfflineLearnerState,
  assessment: "diagnostic" | "final",
  result: { score: number; maximum: number },
  now: string,
): OfflineLearnerState {
  if (
    !Number.isInteger(result.score) ||
    !Number.isInteger(result.maximum) ||
    result.score < 0 ||
    result.maximum < 1 ||
    result.score > result.maximum
  ) {
    throw new Error("Assessment results require a valid score and maximum.");
  }
  const next = cloneState(state);
  const progress =
    assessment === "diagnostic"
      ? next.journey.diagnostic
      : next.journey.finalAssessment;
  if (progress.status === "locked") {
    throw new Error(`The ${assessment} assessment is still locked.`);
  }
  progress.status = "completed";
  progress.currentItemKey = null;
  progress.score = result.score;
  progress.maximum = result.maximum;
  progress.completedAt = now;

  if (assessment === "diagnostic") {
    unlockAllLessons(next);
    unlockAchievement(next, offlineAchievementKeys[0], now);
  } else {
    unlockAchievement(next, offlineAchievementKeys[7], now);
  }
  next.journey.updatedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function skipOfflineDiagnostic(
  state: OfflineLearnerState,
  itemKeys: readonly string[],
  now: string,
): OfflineLearnerState {
  const uniqueItemKeys = [...new Set(itemKeys)];
  if (
    uniqueItemKeys.length < 1 ||
    uniqueItemKeys.length !== itemKeys.length ||
    uniqueItemKeys.some((itemKey) => itemKey.length < 1 || itemKey.length > 160)
  ) {
    throw new Error("The diagnostic requires a valid item count.");
  }
  if (state.journey.diagnostic.status === "completed") return state;

  const next = cloneState(state);
  const diagnostic = next.journey.diagnostic;
  const responseByItemKey = new Map(
    diagnostic.responses.map((response) => [response.itemKey, response]),
  );

  diagnostic.responses = uniqueItemKeys.map(
    (itemKey) =>
      responseByItemKey.get(itemKey) ?? {
        itemKey,
        kind: "skipped" as const,
        value: null,
        outcome: "skipped" as const,
        attempts: 0,
        updatedAt: now,
      },
  );
  diagnostic.status = "completed";
  diagnostic.currentPhase = "assessment-complete";
  diagnostic.currentItemKey = null;
  diagnostic.completedItemKeys = uniqueItemKeys;
  diagnostic.score = diagnostic.responses.filter(
    ({ outcome }) => outcome === "correct",
  ).length;
  diagnostic.maximum = uniqueItemKeys.length;
  diagnostic.completedAt = now;
  unlockAllLessons(next);
  unlockAchievement(next, offlineAchievementKeys[0], now);
  next.journey.updatedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function saveOfflineLessonCheckpoint(
  state: OfflineLearnerState,
  order: 1 | 2 | 3 | 4 | 5 | 6,
  checkpoint: OfflineActivityCheckpoint,
  now: string,
): OfflineLearnerState {
  const next = cloneState(state);
  const lesson = next.journey.lessons[order - 1];
  if (lesson.status === "locked" || lesson.status === "completed") {
    throw new Error(`Lesson ${order} cannot accept a checkpoint now.`);
  }
  lesson.status = "in_progress";
  lesson.currentMissionKey =
    checkpoint.currentMissionKey ?? lesson.currentMissionKey;
  lesson.currentItemKey = checkpoint.currentItemKey;
  lesson.completedItemKeys = [...new Set(checkpoint.completedItemKeys)];
  lesson.responses = mergeResponse(lesson.responses, checkpoint.response, now);
  next.journey.updatedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function completeOfflineLesson(
  state: OfflineLearnerState,
  order: 1 | 2 | 3 | 4 | 5 | 6,
  now: string,
): OfflineLearnerState {
  const next = cloneState(state);
  const lesson = next.journey.lessons[order - 1];
  if (lesson.status === "locked") {
    throw new Error(`Lesson ${order} is still locked.`);
  }
  lesson.status = "completed";
  lesson.currentItemKey = null;
  lesson.completedAt = now;
  unlockAchievement(next, offlineAchievementKeys[order], now);

  if (next.journey.lessons.every(({ status }) => status === "completed")) {
    next.journey.finalAssessment.status = "available";
  }
  next.journey.updatedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function updateOfflineLearnerProfile(
  state: OfflineLearnerState,
  displayName: string,
  now: string,
): OfflineLearnerState {
  const next = cloneState(state);
  next.profile.displayName = displayName.trim();
  next.profile.updatedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function updateOfflineSpeechLanguage(
  state: OfflineLearnerState,
  language: "en" | "fil-PH",
  now: string,
): OfflineLearnerState {
  const next = cloneState(state);
  next.setup.speechLanguage = language;
  next.profile.updatedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function acknowledgeOfflineAsr(
  state: OfflineLearnerState,
  tier: "low" | "medium" | "high",
  now: string,
): OfflineLearnerState {
  const next = cloneState(state);
  next.setup.asr = { tier, acknowledgedAt: now };
  next.setup.onboardingCompletedAt = null;
  return offlineLearnerStateSchema.parse(next);
}

export function acknowledgeOfflineClara(
  state: OfflineLearnerState,
  mode: "static" | "dynamic",
  now: string,
): OfflineLearnerState {
  if (state.setup.asr.acknowledgedAt === null) {
    throw new Error("Speech recognition must be acknowledged before Clara.");
  }
  const next = cloneState(state);
  next.setup.clara = { mode, acknowledgedAt: now };
  next.setup.onboardingCompletedAt = now;
  return offlineLearnerStateSchema.parse(next);
}

export function completeOfflineIntro(
  state: OfflineLearnerState,
  now: string,
): OfflineLearnerState {
  if (state.setup.onboardingCompletedAt === null) {
    throw new Error("Offline onboarding must finish before the intro.");
  }
  if (state.setup.introCompletedAt !== null) return state;

  const next = cloneState(state);
  next.setup.introCompletedAt = now;
  return offlineLearnerStateSchema.parse(next);
}
