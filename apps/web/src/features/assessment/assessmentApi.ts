import { z } from "zod";

const progressSchema = z.object({
  current: z.number().int().positive(),
  total: z.number().int().positive(),
  completed: z.number().int().nonnegative(),
});

const itemSchema = z.union([
  z.object({
    item_key: z.string(),
    display_text: z.string(),
    uppercase_form: z.string(),
    lowercase_form: z.string(),
  }),
  z.object({
    item_key: z.string(),
    word_one: z.string(),
    word_two: z.string(),
  }),
  z.object({ item_key: z.string(), display_text: z.string() }),
]);

const resultSchema = z.object({
  score: z.number().int().min(0).max(30),
  maximum: z.literal(30),
  level: z.string(),
  branch: z.enum(["low", "high"]),
  segments: z.array(
    z.object({
      task: z.string(),
      score: z.number().int().min(0).max(10),
      maximum: z.literal(10),
      status: z.enum(["administered", "automatic", "not_administered"]),
    }),
  ),
  continues_to_part_two: z.boolean(),
});

export const assessmentStateSchema = z.object({
  run_id: z.number().int().positive(),
  assessment_type: z.enum(["diagnostic", "final"]),
  stage: z.enum([
    "orientation",
    "task-1a",
    "task-2a",
    "task-2b",
    "part-1-results",
  ]),
  orientation_ready: z.boolean(),
  progress: progressSchema.nullable(),
  item: itemSchema.nullable(),
  response_committed: z.boolean(),
  result: resultSchema.nullable(),
});

export type AssessmentState = z.infer<typeof assessmentStateSchema>;
export type AssessmentItem = NonNullable<AssessmentState["item"]>;

async function parseResponse(response: Response): Promise<AssessmentState> {
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "ReaDirect could not save that answer.";
    throw new Error(message);
  }

  return assessmentStateSchema.parse(await response.json());
}

function authHeaders(token: string): HeadersInit {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

export async function startPartOne(token: string): Promise<AssessmentState> {
  return parseResponse(
    await fetch("/api/learners/assessments/part-one/start", {
      method: "POST",
      headers: authHeaders(token),
    }),
  );
}

export async function submitOrientation(
  token: string,
  runId: number,
  audio: Blob,
): Promise<AssessmentState> {
  const body = new FormData();
  body.append("audio", audio, "microphone-check.webm");
  return parseResponse(
    await fetch(`/api/learners/assessments/part-one/${runId}/orientation`, {
      method: "POST",
      headers: authHeaders(token),
      body,
    }),
  );
}

export async function submitSpeech(
  token: string,
  runId: number,
  itemKey: string,
  audio: Blob,
): Promise<AssessmentState> {
  const body = new FormData();
  body.append("item_key", itemKey);
  body.append("audio", audio, `${itemKey}.webm`);
  return parseResponse(
    await fetch(`/api/learners/assessments/part-one/${runId}/speech`, {
      method: "POST",
      headers: authHeaders(token),
      body,
    }),
  );
}

export async function submitRhyme(
  token: string,
  runId: number,
  itemKey: string,
  choice: "yes" | "no",
): Promise<AssessmentState> {
  return parseResponse(
    await fetch(`/api/learners/assessments/part-one/${runId}/rhyme`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey, choice }),
    }),
  );
}

export async function skipAssessmentItem(
  token: string,
  runId: number,
  itemKey: string,
): Promise<AssessmentState> {
  return parseResponse(
    await fetch(`/api/learners/assessments/part-one/${runId}/skip`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: itemKey }),
    }),
  );
}

export async function advancePartOne(
  token: string,
  runId: number,
): Promise<AssessmentState> {
  return parseResponse(
    await fetch(`/api/learners/assessments/part-one/${runId}/advance`, {
      method: "POST",
      headers: authHeaders(token),
    }),
  );
}
