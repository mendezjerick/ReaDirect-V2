import { z } from "zod";

const teachingStateSchema = z.enum([
  "LISTENING",
  "INDEPENDENT_FEEDBACK",
  "GIVING_CLUE",
  "GUIDED_RETRY",
  "DEMONSTRATING",
  "ECHO_RETRY",
  "REVIEW_SCHEDULED",
  "ADVANCING",
]);

const lessonOutcomeSchema = z
  .enum([
    "INDEPENDENT_CORRECT",
    "SUPPORTED_CORRECT",
    "DEMONSTRATED",
    "NOT_YET_CORRECT",
    "UNSCORABLE_AUDIO",
    "SKIPPED",
  ])
  .nullable();

const lessonStateSchema = z.object({
  run_id: z.number().int().positive(),
  lesson_key: z.string(),
  status: z.enum(["active", "completed"]),
  mission: z.object({
    key: z.enum(["mission-1", "mission-2", "mission-3"]),
    number: z.number(),
    total: z.number(),
  }),
  progress: z.object({ current: z.number(), total: z.number() }),
  item: z
    .object({
      item_key: z.string(),
      uppercase_form: z.string(),
      lowercase_form: z.string(),
      context_word: z.string(),
      highlighted_display: z.string(),
      missing_display: z.string(),
    })
    .nullable(),
  response: z
    .object({
      id: z.number(),
      decision: z.enum(["CORRECT", "NEEDS_SUPPORT", "SKIPPED"]),
      final_transcript: z.string().nullable(),
      response_type: z.enum(["speech", "skipped"]),
      outcome: lessonOutcomeSchema,
      academic_attempt_count: z.number().int().nonnegative(),
      technical_retry_count: z.number().int().nonnegative(),
      highest_scaffold_used: z.enum([
        "none",
        "targeted_clue",
        "demonstration",
        "echo",
      ]),
      independent_mastery: z.boolean(),
      diagnosis_key: z.string().nullable(),
      review_recommended: z.boolean(),
      attempt_count: z.number().int().nonnegative(),
    })
    .nullable(),
  teaching: z.object({
    state: teachingStateSchema,
    outcome: lessonOutcomeSchema,
    academic_attempt_count: z.number().int().nonnegative(),
    technical_retry_count: z.number().int().nonnegative(),
    highest_scaffold_used: z.enum([
      "none",
      "targeted_clue",
      "demonstration",
      "echo",
    ]),
    independent_mastery: z.boolean(),
    diagnosis_key: z.string().nullable(),
    review_recommended: z.boolean(),
    can_record: z.boolean(),
    can_continue_support: z.boolean(),
    can_advance: z.boolean(),
  }),
  support: z.object({
    sequence_key: z.string(),
    speech: z.array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("published"),
          speech_key: z.string(),
        }),
        z.object({
          kind: z.literal("runtime_feedback"),
          response_id: z.number().int().positive(),
        }),
      ]),
    ),
    display_mode: z.enum([
      "completion",
      "instruction",
      "clue",
      "demonstration",
      "technical_retry",
      "retry",
      "listening",
      "feedback",
    ]),
    after_speech: z.enum([
      "none",
      "record",
      "continue_support",
      "advance",
    ]),
    requires_speech_completion: z.boolean(),
  }),
  completion: z
    .object({
      title: z.string(),
      achievement_key: z.string(),
      achievement_name: z.string(),
      score: z.number().int().nonnegative(),
      maximum: z.number().int().nonnegative(),
      segments: z.array(
        z.object({
          mission_key: z.string(),
          label: z.string(),
          score: z.number().int().nonnegative(),
          maximum: z.number().int().nonnegative(),
          status: z.string(),
        }),
      ),
    })
    .nullable(),
});

export type LessonState = z.infer<typeof lessonStateSchema>;

const headers = (token: string): HeadersInit => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

async function parse(response: Response): Promise<LessonState> {
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    throw new Error(
      typeof data === "object" &&
        data &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "That lesson action could not be saved.",
    );
  }
  return lessonStateSchema.parse(await response.json());
}

export async function startLessonOne(token: string) {
  return parse(
    await fetch("/api/learners/lessons/lesson-1/start", {
      method: "POST",
      headers: headers(token),
    }),
  );
}

export async function getLessonOne(token: string, runId: number) {
  return parse(
    await fetch(`/api/learners/lessons/lesson-1/${runId}`, {
      headers: headers(token),
    }),
  );
}

export async function submitLessonItem(
  token: string,
  runId: number,
  itemKey: string,
  audio: Blob,
) {
  const body = new FormData();
  body.append("item_key", itemKey);
  body.append("audio", audio, `${itemKey}.webm`);
  return parse(
    await fetch(`/api/learners/lessons/lesson-1/${runId}/submit`, {
      method: "POST",
      headers: headers(token),
      body,
    }),
  );
}

export async function skipLessonItem(
  token: string,
  runId: number,
  itemKey: string,
) {
  return parse(
    await fetch(`/api/learners/lessons/lesson-1/${runId}/skip`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
  );
}

export async function continueLessonSupport(
  token: string,
  runId: number,
  itemKey: string,
) {
  return parse(
    await fetch(
      `/api/learners/lessons/lesson-1/${runId}/continue-support`,
      {
        method: "POST",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify({ item_key: itemKey }),
      },
    ),
  );
}

export async function advanceLessonItem(token: string, runId: number) {
  return parse(
    await fetch(`/api/learners/lessons/lesson-1/${runId}/advance`, {
      method: "POST",
      headers: headers(token),
    }),
  );
}

export async function prepareLessonFeedback(
  token: string,
  responseId: number,
): Promise<Blob> {
  const response = await fetch(
    `/api/learners/tts/lesson-feedback/${responseId}`,
    {
      method: "POST",
      headers: { Accept: "audio/wav", Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok)
    throw new Error("Ma'am Clara could not prepare that feedback.");
  return response.blob();
}
