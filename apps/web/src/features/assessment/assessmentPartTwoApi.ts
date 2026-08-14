import { z } from "zod";

import { apiUrl } from "../../lib/apiUrl";
import { audioFilename } from "../../lib/audioFile";
import type { AssessmentType } from "./assessmentApi";

const progressSchema = z.object({
  current: z.number().int().positive(),
  total: z.number().int().positive(),
  completed: z.number().int().nonnegative(),
});

const passageItemSchema = z.object({
  item_key: z.string(),
  kind: z.literal("passage"),
  title: z.string(),
  display_text: z.string(),
  authored_pages: z.array(z.string()).min(1),
  time_limit_seconds: z.literal(60),
});

const comprehensionItemSchema = z.object({
  item_key: z.string(),
  kind: z.literal("comprehension"),
  question_type: z.enum(["who", "what", "where", "when", "why"]),
  question_text: z.string(),
  choices: z
    .array(z.object({ key: z.enum(["a", "b", "c", "d"]), text: z.string() }))
    .length(4),
});

const passageReviewSchema = z.object({
  title: z.string(),
  skipped: z.boolean(),
  review_available: z.boolean(),
  reading_seconds: z.number().nonnegative().nullable(),
  words_per_minute: z.number().int().nonnegative().nullable(),
  correct_words_per_minute: z.number().int().nonnegative().nullable(),
  words: z.array(
    z.object({
      text: z.string(),
      status: z.enum(["correct", "missed", "replaced", "unscored"]),
      heard: z.string().nullable(),
    }),
  ),
  extra_words: z.array(z.string()),
});

export const assessmentPartTwoStateSchema = z.object({
  run_id: z.number().int().positive(),
  assessment_type: z.enum(["diagnostic", "final"]),
  stage: z.enum([
    "story-selection",
    "task-3a",
    "task-3b",
    "passage-results",
    "part-2-results",
    "assessment-complete",
  ]),
  selected_story_key: z.string().nullable(),
  progress: progressSchema.nullable(),
  story_choices: z.array(
    z.object({ story_key: z.string(), title: z.string() }),
  ),
  item: z.union([passageItemSchema, comprehensionItemSchema]).nullable(),
  result: z
    .object({
      score: z.number().int().min(0).max(100),
      maximum: z.literal(100),
      profile: z.string(),
      reading_accuracy_percent: z.number().int().min(0).max(100),
      comprehension_percent: z.number().int().min(0).max(100),
      comprehension_score: z.number().int().min(0).max(5),
      passage_review: passageReviewSchema,
    })
    .nullable(),
  completion: z
    .object({
      kind: z.enum(["diagnostic", "reading-journey-finale"]),
      title: z.string(),
      message: z.string(),
      achievement_keys: z.array(z.string()),
    })
    .nullable(),
});

export type AssessmentPartTwoState = z.infer<
  typeof assessmentPartTwoStateSchema
>;
export type AssessmentPartTwoItem = NonNullable<AssessmentPartTwoState["item"]>;
export type ComprehensionChoice = "a" | "b" | "c" | "d";

function authHeaders(token: string): HeadersInit {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function assessmentApiBase(assessmentType: AssessmentType): string {
  return assessmentType === "final"
    ? "/api/learners/assessments/final"
    : "/api/learners/assessments";
}

async function parseState(response: Response): Promise<AssessmentPartTwoState> {
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

  return assessmentPartTwoStateSchema.parse(await response.json());
}

export async function getPartTwo(
  token: string,
  assessmentType: AssessmentType = "diagnostic",
) {
  return parseState(
    await fetch(
      apiUrl(`${assessmentApiBase(assessmentType)}/part-two/current`),
      {
        headers: authHeaders(token),
      },
    ),
  );
}

export async function selectAssessmentStory(
  token: string,
  runId: number,
  storyKey: string,
  assessmentType: AssessmentType = "diagnostic",
) {
  return parseState(
    await fetch(
      apiUrl(`${assessmentApiBase(assessmentType)}/part-two/${runId}/story`),
      {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ story_key: storyKey }),
      },
    ),
  );
}

export async function submitAssessmentPassage(
  token: string,
  runId: number,
  itemKey: string,
  audio: Blob,
  assessmentType: AssessmentType = "diagnostic",
) {
  const body = new FormData();
  body.append("item_key", itemKey);
  body.append("audio", audio, audioFilename(itemKey, audio));
  return parseState(
    await fetch(
      apiUrl(`${assessmentApiBase(assessmentType)}/part-two/${runId}/passage`),
      {
        method: "POST",
        headers: authHeaders(token),
        body,
      },
    ),
  );
}

export async function submitAssessmentComprehension(
  token: string,
  runId: number,
  itemKey: string,
  choice: ComprehensionChoice,
  assessmentType: AssessmentType = "diagnostic",
) {
  return parseState(
    await fetch(
      apiUrl(
        `${assessmentApiBase(assessmentType)}/part-two/${runId}/comprehension`,
      ),
      {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ item_key: itemKey, choice }),
      },
    ),
  );
}

export async function skipPartTwoItem(
  token: string,
  runId: number,
  itemKey: string,
  assessmentType: AssessmentType = "diagnostic",
) {
  return parseState(
    await fetch(
      apiUrl(`${assessmentApiBase(assessmentType)}/part-two/${runId}/skip`),
      {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ item_key: itemKey }),
      },
    ),
  );
}

export async function continuePartTwoResult(
  token: string,
  runId: number,
  assessmentType: AssessmentType = "diagnostic",
) {
  return parseState(
    await fetch(
      apiUrl(`${assessmentApiBase(assessmentType)}/part-two/${runId}/continue`),
      {
        method: "POST",
        headers: authHeaders(token),
      },
    ),
  );
}

export async function finishAssessment(
  token: string,
  runId: number,
  assessmentType: AssessmentType = "diagnostic",
) {
  const response = await fetch(
    apiUrl(`${assessmentApiBase(assessmentType)}/part-two/${runId}/finish`),
    { method: "POST", headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error("The assessment could not finish yet.");

  return z
    .object({ completed: z.literal(true), next_route: z.string() })
    .parse(await response.json());
}
