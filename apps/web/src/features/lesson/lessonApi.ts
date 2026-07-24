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

const lessonSupportSchema = z.object({
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
      z.object({
        kind: z.literal("runtime_demonstration"),
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
  after_speech: z.enum(["none", "record", "continue_support", "advance"]),
  requires_speech_completion: z.boolean(),
});

const lessonResponseSchema = z
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
  .nullable();

const lessonTeachingSchema = z.object({
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
});

const lessonCompletionSchema = z
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
  .nullable();

const lessonPracticeTriesSchema = z.object({
  count: z.number().int().nonnegative(),
  entries: z.array(
    z.object({
      attempt_id: z.number().int().positive(),
      mission_key: z.string(),
      mission_number: z.number().int().positive(),
      item_key: z.string(),
      item_order: z.number().int().positive(),
      attempt_number: z.number().int().positive(),
      final_transcript: z.string(),
    }),
  ),
});

export type LessonPracticeTries = z.infer<typeof lessonPracticeTriesSchema>;

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
  response: lessonResponseSchema,
  teaching: lessonTeachingSchema,
  support: lessonSupportSchema,
  practice_tries: lessonPracticeTriesSchema,
  completion: lessonCompletionSchema,
});

export type LessonState = z.infer<typeof lessonStateSchema>;

const lessonTwoStateSchema = z.object({
  run_id: z.number().int().positive(),
  lesson_key: z.literal("required-lesson-2"),
  content_version: z.string(),
  status: z.enum(["active", "completed"]),
  mission: z.object({
    key: z.enum(["mission-1", "mission-2"]),
    number: z.number(),
    total: z.literal(2),
    title: z.string(),
  }),
  progress: z.object({ current: z.number(), total: z.number() }),
  item: z
    .discriminatedUnion("presentation", [
      z.object({
        item_key: z.string(),
        presentation: z.literal("display_word"),
        display_text: z.string(),
      }),
      z.object({
        item_key: z.string(),
        presentation: z.literal("highlighted_sentence_word"),
        context_sentence: z.string(),
        highlighted_word: z.string(),
        highlight_occurrence: z.number().int().positive(),
      }),
    ])
    .nullable(),
  response: lessonResponseSchema,
  teaching: lessonTeachingSchema,
  support: lessonSupportSchema,
  practice_tries: lessonPracticeTriesSchema,
  completion: lessonCompletionSchema,
});

export type LessonTwoState = z.infer<typeof lessonTwoStateSchema>;

const lessonThreeStateSchema = z.object({
  run_id: z.number().int().positive(),
  lesson_key: z.literal("required-lesson-3"),
  content_version: z.string(),
  status: z.enum(["active", "completed"]),
  mission: z.object({
    key: z.literal("mission-1"),
    number: z.literal(1),
    total: z.literal(1),
    title: z.string(),
  }),
  progress: z.object({ current: z.number(), total: z.literal(5) }),
  item: z
    .object({
      item_key: z.string(),
      presentation: z.literal("display_phrase"),
      display_text: z.string(),
    })
    .nullable(),
  response: lessonResponseSchema,
  teaching: lessonTeachingSchema,
  support: lessonSupportSchema,
  practice_tries: lessonPracticeTriesSchema,
  completion: lessonCompletionSchema,
});

export type LessonThreeState = z.infer<typeof lessonThreeStateSchema>;

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

async function parseLessonTwo(response: Response): Promise<LessonTwoState> {
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
  return lessonTwoStateSchema.parse(await response.json());
}

async function parseLessonThree(response: Response): Promise<LessonThreeState> {
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
  return lessonThreeStateSchema.parse(await response.json());
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
    await fetch(`/api/learners/lessons/lesson-1/${runId}/continue-support`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
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

export async function startLessonTwo(token: string) {
  return parseLessonTwo(
    await fetch("/api/learners/lessons/lesson-2/start", {
      method: "POST",
      headers: headers(token),
    }),
  );
}

export async function getLessonTwo(token: string, runId: number) {
  return parseLessonTwo(
    await fetch(`/api/learners/lessons/lesson-2/${runId}`, {
      headers: headers(token),
    }),
  );
}

export async function submitLessonTwoItem(
  token: string,
  runId: number,
  itemKey: string,
  audio: Blob,
) {
  const body = new FormData();
  body.append("item_key", itemKey);
  body.append("audio", audio, `${itemKey}.webm`);
  return parseLessonTwo(
    await fetch(`/api/learners/lessons/lesson-2/${runId}/submit`, {
      method: "POST",
      headers: headers(token),
      body,
    }),
  );
}

export async function skipLessonTwoItem(
  token: string,
  runId: number,
  itemKey: string,
) {
  return parseLessonTwo(
    await fetch(`/api/learners/lessons/lesson-2/${runId}/skip`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
  );
}

export async function continueLessonTwoSupport(
  token: string,
  runId: number,
  itemKey: string,
) {
  return parseLessonTwo(
    await fetch(`/api/learners/lessons/lesson-2/${runId}/continue-support`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
  );
}

export async function advanceLessonTwoItem(token: string, runId: number) {
  return parseLessonTwo(
    await fetch(`/api/learners/lessons/lesson-2/${runId}/advance`, {
      method: "POST",
      headers: headers(token),
    }),
  );
}

export async function prepareLessonDemonstration(
  token: string,
  responseId: number,
): Promise<Blob> {
  const response = await fetch(
    `/api/learners/tts/lesson-demonstration/${responseId}`,
    {
      method: "POST",
      headers: { Accept: "audio/wav", Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw new Error("Ma'am Clara could not prepare that word.");
  return response.blob();
}

export async function startLessonThree(token: string) {
  return parseLessonThree(
    await fetch("/api/learners/lessons/lesson-3/start", {
      method: "POST",
      headers: headers(token),
    }),
  );
}

export async function getLessonThree(token: string, runId: number) {
  return parseLessonThree(
    await fetch(`/api/learners/lessons/lesson-3/${runId}`, {
      headers: headers(token),
    }),
  );
}

export async function submitLessonThreeItem(
  token: string,
  runId: number,
  itemKey: string,
  audio: Blob,
) {
  const body = new FormData();
  body.append("item_key", itemKey);
  body.append("audio", audio, `${itemKey}.webm`);
  return parseLessonThree(
    await fetch(`/api/learners/lessons/lesson-3/${runId}/submit`, {
      method: "POST",
      headers: headers(token),
      body,
    }),
  );
}

export async function skipLessonThreeItem(
  token: string,
  runId: number,
  itemKey: string,
) {
  return parseLessonThree(
    await fetch(`/api/learners/lessons/lesson-3/${runId}/skip`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
  );
}

export async function continueLessonThreeSupport(
  token: string,
  runId: number,
  itemKey: string,
) {
  return parseLessonThree(
    await fetch(`/api/learners/lessons/lesson-3/${runId}/continue-support`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
  );
}

export async function advanceLessonThreeItem(token: string, runId: number) {
  return parseLessonThree(
    await fetch(`/api/learners/lessons/lesson-3/${runId}/advance`, {
      method: "POST",
      headers: headers(token),
    }),
  );
}
