import { z } from "zod";

const choiceKeySchema = z.enum(["a", "b", "c", "d"]);
const assistanceSchema = z.enum([
  "none",
  "targeted_clue",
  "guided_display",
  "demonstration",
]);

const lessonSixStateSchema = z.object({
  run_id: z.number().int().positive(),
  lesson_key: z.literal("required-lesson-6"),
  content_version: z.string(),
  status: z.enum(["active", "completed"]),
  mission: z.object({
    key: z.literal("mission-1"),
    number: z.literal(1),
    total: z.literal(1),
    title: z.string(),
  }),
  progress: z.object({
    current: z.number().int().positive(),
    total: z.literal(5),
  }),
  item: z
    .object({
      item_key: z.string(),
      question_type: z.enum(["who", "what", "where", "when", "why"]),
      display_sentence: z.string(),
      question_text: z.string(),
      choices: z
        .array(z.object({ key: choiceKeySchema, text: z.string() }))
        .length(4),
      evidence_span: z.string().nullable(),
      correct_choice_key: choiceKeySchema.nullable(),
    })
    .nullable(),
  response: z
    .object({
      id: z.number().int().positive(),
      decision: z.enum(["CORRECT", "NEEDS_SUPPORT", "SKIPPED"]),
      outcome: z
        .enum([
          "INDEPENDENT_CORRECT",
          "SUPPORTED_CORRECT",
          "DEMONSTRATED",
          "SKIPPED",
        ])
        .nullable(),
      attempt_count: z.number().int().nonnegative(),
      wrong_choice_count: z.number().int().nonnegative(),
      assistance_level: assistanceSchema,
      disabled_choices: z.array(choiceKeySchema),
      last_selected_choice: choiceKeySchema.nullable(),
    })
    .nullable(),
  teaching: z.object({
    can_choose: z.boolean(),
    can_advance: z.boolean(),
    assistance_level: assistanceSchema,
    show_evidence: z.boolean(),
    show_correct_choice: z.boolean(),
  }),
  support: z.object({
    sequence_key: z.string(),
    speech_key: z.string().nullable(),
    speech_keys: z.array(z.string()),
    requires_speech_completion: z.boolean(),
  }),
  completion: z
    .object({
      title: z.string(),
      message: z.string(),
      achievement_key: z.string(),
      achievement_name: z.string(),
      resolved_count: z.number().int().nonnegative(),
      total: z.literal(5),
      lessons: z.array(
        z.object({
          lesson: z.number().int().min(1).max(6),
          complete: z.boolean(),
        }),
      ),
    })
    .nullable(),
});

export type LessonSixChoiceKey = "a" | "b" | "c" | "d";
export type LessonSixState = z.infer<typeof lessonSixStateSchema>;

const headers = (token: string): HeadersInit => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

async function parse(response: Response): Promise<LessonSixState> {
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    throw new Error(
      typeof data === "object" &&
        data &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "That Lesson 6 action could not be saved.",
    );
  }
  return lessonSixStateSchema.parse(await response.json());
}

export async function startLessonSix(token: string) {
  return parse(
    await fetch("/api/learners/lessons/lesson-6/start", {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: "{}",
    }),
  );
}

export async function getLessonSix(token: string, runId: number) {
  return parse(
    await fetch(`/api/learners/lessons/lesson-6/${runId}`, {
      headers: headers(token),
    }),
  );
}

export async function submitLessonSixChoice(
  token: string,
  runId: number,
  itemKey: string,
  choice: LessonSixChoiceKey,
) {
  return parse(
    await fetch(`/api/learners/lessons/lesson-6/${runId}/submit`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey, choice }),
    }),
  );
}

export async function skipLessonSixItem(
  token: string,
  runId: number,
  itemKey: string,
) {
  return parse(
    await fetch(`/api/learners/lessons/lesson-6/${runId}/skip`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
  );
}

export async function advanceLessonSixItem(token: string, runId: number) {
  return parse(
    await fetch(`/api/learners/lessons/lesson-6/${runId}/advance`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: "{}",
    }),
  );
}
