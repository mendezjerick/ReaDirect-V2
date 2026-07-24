import { z } from "zod";

const learnWithClaraSpeechKeySchema = z.enum([
  "learn-with-clara-lesson-1-pair-a",
  "learn-with-clara-lesson-1-pair-b",
  "learn-with-clara-lesson-1-pair-c",
  "learn-with-clara-lesson-1-pair-d",
  "learn-with-clara-lesson-1-pair-e",
  "learn-with-clara-lesson-1-story-name-opening",
  "learn-with-clara-lesson-1-story-name-detail",
  "learn-with-clara-lesson-1-story-name-close",
  "learn-with-clara-lesson-1-story-name-return",
  "learn-with-clara-lesson-1-chapter-1-complete",
]);

const listeningChoiceSchema = z.object({
  action: z.enum(["tell_more", "keep_learning"]),
  label: z.string(),
});

const listeningStateSchema = z.object({
  session_id: z.number().int().positive(),
  lesson_key: z.literal("lesson-1"),
  chapter_key: z.literal("chapter-1"),
  status: z.enum(["active", "chapter-1-complete"]),
  story_branch: z.enum(["tell_more", "keep_learning"]).nullable(),
  heard_story_keys: z.array(z.string()),
  visit_count: z.number().int().positive(),
  scene: z.object({
    key: z.string(),
    kind: z.enum(["letter_pair", "story", "completion"]),
    title: z.string(),
    display_text: z.string(),
    speech_key: learnWithClaraSpeechKeySchema,
    item_progress: z
      .object({
        current: z.number().int().min(1).max(5),
        total: z.literal(5),
      })
      .nullable(),
    choices: z.array(listeningChoiceSchema).optional(),
  }),
  prefetch_speech_keys: z.array(learnWithClaraSpeechKeySchema),
});

export type LearnWithClaraListeningState = z.infer<typeof listeningStateSchema>;
export type LearnWithClaraAction = "continue" | "tell_more" | "keep_learning";

const headers = (token: string): HeadersInit => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

async function parse(
  response: Response,
): Promise<LearnWithClaraListeningState> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new Error(
      typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
        ? body.message
        : "Ma'am Clara could not save that listening place.",
    );
  }

  return listeningStateSchema.parse(await response.json());
}

export async function startLearnWithClaraLessonOne(token: string) {
  return parse(
    await fetch("/api/learners/learn-with-clara/lesson-1/start", {
      method: "POST",
      headers: headers(token),
    }),
  );
}

export async function advanceLearnWithClaraLessonOne(
  token: string,
  sceneKey: string,
  action: LearnWithClaraAction,
) {
  return parse(
    await fetch("/api/learners/learn-with-clara/lesson-1/advance", {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        scene_key: sceneKey,
        action,
      }),
    }),
  );
}

export async function restartLearnWithClaraLessonOne(token: string) {
  return parse(
    await fetch("/api/learners/learn-with-clara/lesson-1/restart", {
      method: "POST",
      headers: headers(token),
    }),
  );
}
