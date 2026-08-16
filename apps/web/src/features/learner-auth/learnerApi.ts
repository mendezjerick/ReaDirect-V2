import { z } from "zod";

import { apiFetch as fetch, apiUrl } from "../../lib/apiUrl";
import {
  getNativeSessionCache,
  isNativeSecureSessionAvailable,
  persistNativeSession,
  removeNativeSession,
  setNativeSessionCache,
} from "../../app/nativeSecureSession";
import { clearActivitySpeechPreparation } from "../clara-audio/activitySpeechReadiness";

const learnerProgressSchema = z.object({
  stage: z.string(),
  current_required_lesson_order: z.number().int().positive().nullable(),
});

const lessonOrderSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const learnerReadingPathSchema = z
  .object({
    diagnostic: z.object({
      status: z.enum(["required", "in_progress", "completed", "skipped"]),
      score: z.number().int().nullable(),
    }),
    lessons: z
      .array(
        z.object({
          order: lessonOrderSchema,
          status: z.enum(["not_started", "in_progress", "completed"]),
        }),
      )
      .length(6),
    completed_lesson_count: z.number().int().min(0).max(6),
    final_assessment: z.object({
      status: z.enum(["locked", "available", "in_progress", "completed"]),
    }),
  })
  .refine(
    (path) => new Set(path.lessons.map((lesson) => lesson.order)).size === 6,
    { message: "Reading path must contain each lesson exactly once." },
  )
  .refine(
    (path) =>
      path.completed_lesson_count ===
      path.lessons.filter((lesson) => lesson.status === "completed").length,
    { message: "Completed lesson count must match lesson statuses." },
  );

export type LearnerReadingPath = z.infer<typeof learnerReadingPathSchema>;

export const learnerSpeechLanguageSchema = z.enum(["en", "fil-PH"]);
export type LearnerSpeechLanguage = z.infer<typeof learnerSpeechLanguageSchema>;

const legacyReadingPath: LearnerReadingPath = {
  diagnostic: { status: "required", score: null },
  lessons: [1, 2, 3, 4, 5, 6].map((order) => ({
    order: lessonOrderSchema.parse(order),
    status: "not_started" as const,
  })),
  completed_lesson_count: 0,
  final_assessment: { status: "locked" },
};

const learnerAccountSchema = z.object({
  id: z.number().int().positive(),
  learner_code: z.string().regex(/^[A-Z]{2}\d{3}$/),
  full_name: z.string(),
  first_name: z.string(),
  account_purpose: z.enum(["standard", "portal_system"]),
  speech_language: learnerSpeechLanguageSchema.default("en"),
  school: z.string().nullable(),
  grade_level: z.number().int().min(1).max(6).nullable(),
  section: z.string().nullable(),
  progress: learnerProgressSchema,
  achievement_keys: z.array(z.string()).default([]),
});

const learnerSessionSchema = z.object({
  reading_path: learnerReadingPathSchema.default(legacyReadingPath),
  learner: learnerAccountSchema,
  session: z.object({ expires_at: z.string() }),
});

const diagnosticSkipResponseSchema = z.object({
  reading_path: learnerReadingPathSchema,
});

const learnerLoginResponseSchema = learnerSessionSchema.extend({
  token: z.string().min(1),
});

const learnerApiErrorSchema = z.object({
  message: z.string().optional(),
  errors: z.object({ learner_code: z.array(z.string()).optional() }).optional(),
});

export type LearnerSession = z.infer<typeof learnerSessionSchema>;

/** A response from Laravel proves that this persisted session is no longer valid. */
export class LearnerSessionInvalidError extends Error {
  constructor() {
    super("The learner session is no longer valid.");
    this.name = "LearnerSessionInvalidError";
  }
}

const learnerExperienceSettingsSchema = z.object({
  revision: z.string(),
  display_mode: z.enum(["live2d", "static"]),
  speech_mode: z.enum(["hybrid", "published_only"]),
});

const learnerSpeechLanguageContractSchema = z.object({
  speech_language: learnerSpeechLanguageSchema,
  languages: z.array(
    z.object({
      code: learnerSpeechLanguageSchema,
      label: z.string(),
      available: z.boolean(),
      selected: z.boolean(),
    }),
  ),
});

export type LearnerSpeechLanguageContract = z.infer<
  typeof learnerSpeechLanguageContractSchema
>;

export type LearnerExperienceSettings = z.infer<
  typeof learnerExperienceSettingsSchema
>;

const learnerSessionStorageKey = "readirect.learner-session";
const browserSessionToken = "cookie-session";
const browserSessionMarker = "readirect_learner_signed_in";
export const learnerSessionChangedEvent = "readirect:learner-session-changed";

function announceLearnerSessionChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(learnerSessionChangedEvent));
  }
}

function setBrowserSessionMarker(signedIn: boolean): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = signedIn
    ? `${browserSessionMarker}=1; Path=/; SameSite=Lax${secure}`
    : `${browserSessionMarker}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

interface StoredLearnerSession extends LearnerSession {
  token: string;
}

type StoredLearnerSessionInput = Omit<StoredLearnerSession, "reading_path"> & {
  reading_path?: LearnerReadingPath;
};

export function hydrateLearnerSession(): void {
  if (!isNativeSecureSessionAvailable()) return;
  const cached = getNativeSessionCache(learnerSessionStorageKey);
  if (cached === undefined) return;
  try {
    const parsed = learnerLoginResponseSchema.safeParse(
      JSON.parse(cached ?? "null"),
    );
    if (!parsed.success) setNativeSessionCache(learnerSessionStorageKey, null);
  } catch {
    setNativeSessionCache(learnerSessionStorageKey, null);
  }
}

async function readApiError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = learnerApiErrorSchema.safeParse(body);

  if (!parsed.success) {
    return "ReaDirect could not complete that request.";
  }

  return (
    parsed.data.errors?.learner_code?.[0] ??
    parsed.data.message ??
    "ReaDirect could not complete that request."
  );
}

export async function saveLearnerSession(
  session: StoredLearnerSessionInput,
): Promise<void> {
  const normalizedSession = learnerLoginResponseSchema.parse(session);

  if (isNativeSecureSessionAvailable()) {
    const serialized = JSON.stringify(normalizedSession);
    setNativeSessionCache(learnerSessionStorageKey, serialized);
    try {
      await persistNativeSession(learnerSessionStorageKey, serialized);
    } catch (error) {
      setNativeSessionCache(learnerSessionStorageKey, null);
      throw error;
    }
    announceLearnerSessionChange();
    return;
  }

  const browserSession = { ...normalizedSession, token: browserSessionToken };

  window.sessionStorage.setItem(
    learnerSessionStorageKey,
    JSON.stringify(browserSession),
  );
  setBrowserSessionMarker(true);
  announceLearnerSessionChange();
}

export async function restoreLearnerSession(): Promise<StoredLearnerSession | null> {
  const response = await fetch(apiUrl("/api/learners/session"), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const session = learnerSessionSchema.parse(await response.json());
  return { ...session, token: browserSessionToken };
}

export function loadLearnerSession(): StoredLearnerSession | null {
  if (isNativeSecureSessionAvailable()) {
    const cached = getNativeSessionCache(learnerSessionStorageKey);
    if (!cached) return null;
    const parsed = learnerLoginResponseSchema.safeParse(JSON.parse(cached));
    return parsed.success ? parsed.data : null;
  }

  const stored = window.sessionStorage.getItem(learnerSessionStorageKey);

  if (!stored) {
    return null;
  }

  try {
    const parsed = learnerLoginResponseSchema.safeParse(JSON.parse(stored));

    if (parsed.success) {
      if (parsed.data.token === browserSessionToken) return parsed.data;
      window.sessionStorage.removeItem(learnerSessionStorageKey);
      return null;
    }
  } catch {
    // Invalid local sessions are discarded below.
  }

  window.sessionStorage.removeItem(learnerSessionStorageKey);
  return null;
}

export function clearLearnerSession(): void {
  const session = loadLearnerSession();

  if (session) {
    clearActivitySpeechPreparation(session.token);
  }

  if (isNativeSecureSessionAvailable()) {
    setNativeSessionCache(learnerSessionStorageKey, null);
    void removeNativeSession(learnerSessionStorageKey);
  } else {
    window.sessionStorage.removeItem(learnerSessionStorageKey);
    setBrowserSessionMarker(false);
  }
  announceLearnerSessionChange();
}

export async function loginLearner(credentials: {
  learner_code: string;
  password: string;
}): Promise<StoredLearnerSession> {
  const response = await fetch(apiUrl("/api/learners/login"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      learner_code: credentials.learner_code.trim().toUpperCase(),
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return learnerLoginResponseSchema.parse(await response.json());
}

export async function getLearnerSession(
  token: string,
): Promise<LearnerSession> {
  const response = await fetch(apiUrl("/api/learners/session"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new LearnerSessionInvalidError();
    }
    throw new Error(await readApiError(response));
  }

  return learnerSessionSchema.parse(await response.json());
}

export async function skipDiagnostic(
  token: string,
): Promise<LearnerReadingPath> {
  const response = await fetch(
    apiUrl("/api/learners/assessments/diagnostic/skip"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return diagnosticSkipResponseSchema.parse(await response.json()).reading_path;
}

export async function getLearnerExperienceSettings(
  token: string,
): Promise<LearnerExperienceSettings> {
  const response = await fetch(apiUrl("/api/learners/experience/settings"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return learnerExperienceSettingsSchema.parse(await response.json());
}

export async function getLearnerSpeechLanguage(
  token: string,
): Promise<LearnerSpeechLanguageContract> {
  const response = await fetch(apiUrl("/api/learners/tts/language"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return learnerSpeechLanguageContractSchema.parse(await response.json());
}

export async function updateLearnerSpeechLanguage(
  token: string,
  speechLanguage: LearnerSpeechLanguage,
): Promise<LearnerSpeechLanguageContract> {
  const response = await fetch(apiUrl("/api/learners/tts/language"), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ speech_language: speechLanguage }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return learnerSpeechLanguageContractSchema.parse(await response.json());
}

export async function getIntroExperienceSettings(): Promise<LearnerExperienceSettings> {
  const response = await fetch(apiUrl("/api/experience/intro/settings"), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return learnerExperienceSettingsSchema.parse(await response.json());
}

export async function logoutLearner(token: string): Promise<void> {
  const response = await fetch(apiUrl("/api/learners/logout"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(await readApiError(response));
  }
}
