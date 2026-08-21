export const guestToken = "guest-local-v1";
export const guestStorageKey = "readirect.guest-profile.v1";

export type GuestAssessmentType = "diagnostic" | "final";

export interface GuestReadingPath {
  diagnostic: {
    status: "required" | "in_progress" | "completed" | "skipped";
    score: number | null;
  };
  lessons: Array<{
    order: 1 | 2 | 3 | 4 | 5 | 6;
    status: "not_started" | "in_progress" | "completed";
  }>;
  completed_lesson_count: number;
  final_assessment: {
    status: "locked" | "available" | "in_progress" | "completed";
  };
}

export interface GuestAssessmentProgress {
  runId: number;
  partOneStage:
    "orientation" | "task-1a" | "task-2a" | "task-2b" | "part-1-results";
  partOneIndex: number;
  partOneScore: number;
  partTwoStage:
    | "story-selection"
    | "task-3a"
    | "passage-results"
    | "task-3b"
    | "part-2-results"
    | "assessment-complete";
  selectedStoryKey: string | null;
  comprehensionIndex: number;
  comprehensionScore: number;
  passageScore: number;
  completed: boolean;
}

export interface GuestLessonProgress {
  runId: number;
  itemIndex: number;
  response: "correct" | "incorrect" | "skipped" | null;
  finalTranscript: string | null;
  status: "active" | "review" | "completed";
}

export interface GuestGameProfile {
  audience: "learner";
  username: string;
  discriminator: string;
  publicHandle: string;
  isActive: boolean;
}

export interface GuestGameSave {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: Record<string, unknown>;
  revision: number;
  savedAt: string;
}

export interface GuestStore {
  version: 1;
  active: boolean;
  updatedAt: string;
  speechLanguage: "en" | "fil-PH";
  readingPath: GuestReadingPath;
  achievementKeys: string[];
  assessments: Record<GuestAssessmentType, GuestAssessmentProgress>;
  lessons: Record<string, GuestLessonProgress>;
  gameProfile: GuestGameProfile | null;
  gameSaves: Record<string, GuestGameSave>;
}

function initialReadingPath(): GuestReadingPath {
  return {
    diagnostic: { status: "required", score: null },
    lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
      order: order as 1 | 2 | 3 | 4 | 5 | 6,
      status: "not_started" as const,
    })),
    completed_lesson_count: 0,
    final_assessment: { status: "locked" },
  };
}

function initialAssessment(runId: number): GuestAssessmentProgress {
  return {
    runId,
    partOneStage: "orientation",
    partOneIndex: 0,
    partOneScore: 0,
    partTwoStage: "story-selection",
    selectedStoryKey: null,
    comprehensionIndex: 0,
    comprehensionScore: 0,
    passageScore: 0,
    completed: false,
  };
}

function initialStore(active = false): GuestStore {
  return {
    version: 1,
    active,
    updatedAt: new Date().toISOString(),
    speechLanguage: "en",
    readingPath: initialReadingPath(),
    achievementKeys: [],
    assessments: {
      diagnostic: initialAssessment(1),
      final: initialAssessment(2),
    },
    lessons: {},
    gameProfile: null,
    gameSaves: {},
  };
}

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isGuestStore(value: unknown): value is GuestStore {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GuestStore>;
  return (
    candidate.version === 1 &&
    typeof candidate.active === "boolean" &&
    typeof candidate.updatedAt === "string" &&
    (candidate.speechLanguage === "en" ||
      candidate.speechLanguage === "fil-PH") &&
    Boolean(candidate.readingPath) &&
    Array.isArray(candidate.achievementKeys) &&
    Boolean(candidate.assessments) &&
    Boolean(candidate.lessons) &&
    Boolean(candidate.gameSaves)
  );
}

export function loadGuestStore(): GuestStore | null {
  if (!isStorageAvailable()) return null;
  const stored = window.localStorage.getItem(guestStorageKey);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (isGuestStore(parsed)) return parsed;
  } catch {
    // Corrupt guest data is replaced with a clean, inactive profile below.
  }

  const replacement = initialStore(false);
  window.localStorage.setItem(guestStorageKey, JSON.stringify(replacement));
  return replacement;
}

export function saveGuestStore(store: GuestStore): GuestStore {
  const normalized = {
    ...store,
    version: 1 as const,
    updatedAt: new Date().toISOString(),
  };
  if (isStorageAvailable()) {
    window.localStorage.setItem(guestStorageKey, JSON.stringify(normalized));
  }
  return normalized;
}

export function updateGuestStore(
  update: (current: GuestStore) => GuestStore,
): GuestStore {
  return saveGuestStore(update(loadGuestStore() ?? initialStore(false)));
}

export function startGuestSession(): GuestStore {
  return updateGuestStore((current) => ({ ...current, active: true }));
}

export function exitGuestSession(): void {
  const current = loadGuestStore();
  if (current) saveGuestStore({ ...current, active: false });
}

export function resetGuestProgress(): GuestStore {
  return saveGuestStore(initialStore(true));
}

export function hasGuestProgress(): boolean {
  return loadGuestStore() !== null;
}

export function isGuestSessionActive(): boolean {
  return loadGuestStore()?.active === true;
}

export function isGuestToken(token: string | null | undefined): boolean {
  return token === guestToken && isGuestSessionActive();
}

export function guestSessionSnapshot(store = loadGuestStore()) {
  if (!store?.active) return null;

  const stage =
    store.readingPath.final_assessment.status === "completed"
      ? "reading_journey_complete"
      : store.readingPath.final_assessment.status === "available" ||
          store.readingPath.final_assessment.status === "in_progress"
        ? "final_assessment"
        : store.readingPath.diagnostic.status === "required"
          ? "before_diagnostic"
          : "reading_lessons";
  const currentLesson = store.readingPath.lessons.find(
    (lesson) => lesson.status !== "completed",
  );

  return {
    token: guestToken,
    reading_path: store.readingPath,
    learner: {
      id: 1,
      learner_code: "GS000",
      full_name: "Guest Reader",
      first_name: "Guest",
      account_purpose: "guest" as const,
      speech_language: store.speechLanguage,
      school: null,
      grade_level: null,
      section: null,
      progress: {
        stage,
        current_required_lesson_order: currentLesson?.order ?? null,
      },
      achievement_keys: store.achievementKeys,
    },
    session: { expires_at: "9999-12-31T23:59:59Z" },
  };
}

export function markGuestDiagnosticSkipped(): GuestReadingPath {
  return updateGuestStore((current) => {
    const progress = current.assessments.diagnostic;
    const score = Math.min(
      100,
      Math.round(
        (progress.partOneScore / 30) * 50 +
          progress.passageScore / 2 +
          progress.comprehensionScore * 5,
      ),
    );

    return {
      ...current,
      achievementKeys: Array.from(
        new Set([...current.achievementKeys, "reading.ready_reader"]),
      ),
      assessments: {
        ...current.assessments,
        diagnostic: {
          ...progress,
          partOneStage: "part-1-results",
          partTwoStage: "assessment-complete",
          completed: true,
        },
      },
      readingPath: {
        ...current.readingPath,
        diagnostic: { status: "completed", score },
      },
    };
  }).readingPath;
}

export function setGuestSpeechLanguage(language: "en" | "fil-PH"): GuestStore {
  return updateGuestStore((current) => ({
    ...current,
    speechLanguage: language,
  }));
}

export function completeGuestLesson(
  lessonNumber: 1 | 2 | 3 | 4 | 5 | 6,
  achievementKey: string,
): GuestStore {
  return updateGuestStore((current) => {
    const lessons = current.readingPath.lessons.map((lesson) =>
      lesson.order === lessonNumber
        ? { ...lesson, status: "completed" as const }
        : lesson,
    );
    const completedLessonCount = lessons.filter(
      (lesson) => lesson.status === "completed",
    ).length;
    return {
      ...current,
      achievementKeys: Array.from(
        new Set([...current.achievementKeys, achievementKey]),
      ),
      readingPath: {
        ...current.readingPath,
        lessons,
        completed_lesson_count: completedLessonCount,
        final_assessment: {
          status: completedLessonCount === 6 ? "available" : "locked",
        },
      },
    };
  });
}

export function markGuestLessonStarted(
  lessonNumber: 1 | 2 | 3 | 4 | 5 | 6,
): void {
  updateGuestStore((current) => ({
    ...current,
    readingPath: {
      ...current.readingPath,
      lessons: current.readingPath.lessons.map((lesson) =>
        lesson.order === lessonNumber && lesson.status === "not_started"
          ? { ...lesson, status: "in_progress" as const }
          : lesson,
      ),
    },
  }));
}

export function completeGuestAssessment(
  type: GuestAssessmentType,
  score: number,
): GuestStore {
  return updateGuestStore((current) => {
    const achievementKey =
      type === "final" ? "reading.readirect_champion" : "reading.ready_reader";
    return {
      ...current,
      achievementKeys: Array.from(
        new Set([...current.achievementKeys, achievementKey]),
      ),
      assessments: {
        ...current.assessments,
        [type]: { ...current.assessments[type], completed: true },
      },
      readingPath: {
        ...current.readingPath,
        diagnostic:
          type === "diagnostic"
            ? { status: "completed", score }
            : current.readingPath.diagnostic,
        final_assessment:
          type === "final"
            ? { status: "completed" }
            : current.readingPath.final_assessment,
      },
    };
  });
}
