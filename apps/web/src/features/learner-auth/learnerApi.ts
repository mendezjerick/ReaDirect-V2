import { z } from "zod";

const learnerProgressSchema = z.object({
  stage: z.string(),
  current_required_lesson_order: z.number().int().positive().nullable(),
});

const learnerAccountSchema = z.object({
  id: z.number().int().positive(),
  learner_code: z.string().regex(/^[A-Z]{2}\d{3}$/),
  full_name: z.string(),
  first_name: z.string(),
  account_purpose: z.enum(["standard", "portal_system"]),
  school: z.string().nullable(),
  grade_level: z.number().int().min(1).max(6).nullable(),
  section: z.string().nullable(),
  progress: learnerProgressSchema,
});

const learnerSessionSchema = z.object({
  learner: learnerAccountSchema,
  session: z.object({ expires_at: z.string() }),
});

const learnerLoginResponseSchema = learnerSessionSchema.extend({
  token: z.string().min(1),
});

const learnerApiErrorSchema = z.object({
  message: z.string().optional(),
  errors: z.object({ learner_code: z.array(z.string()).optional() }).optional(),
});

export type LearnerSession = z.infer<typeof learnerSessionSchema>;

const learnerSessionStorageKey = "readirect.learner-session";

interface StoredLearnerSession extends LearnerSession {
  token: string;
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

export function saveLearnerSession(session: StoredLearnerSession): void {
  window.sessionStorage.setItem(
    learnerSessionStorageKey,
    JSON.stringify(session),
  );
}

export function loadLearnerSession(): StoredLearnerSession | null {
  const stored = window.sessionStorage.getItem(learnerSessionStorageKey);

  if (!stored) {
    return null;
  }

  try {
    const parsed = learnerLoginResponseSchema.safeParse(JSON.parse(stored));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid local sessions are discarded below.
  }

  window.sessionStorage.removeItem(learnerSessionStorageKey);
  return null;
}

export function clearLearnerSession(): void {
  window.sessionStorage.removeItem(learnerSessionStorageKey);
}

export async function loginLearner(credentials: {
  learner_code: string;
  password: string;
}): Promise<StoredLearnerSession> {
  const response = await fetch("/api/learners/login", {
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
  const response = await fetch("/api/learners/session", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return learnerSessionSchema.parse(await response.json());
}

export async function logoutLearner(token: string): Promise<void> {
  const response = await fetch("/api/learners/logout", {
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
