import { z } from "zod";

const lettersSpeechKeySchema = z.enum([
  "learn-with-clara-letters-parade-opening",
  "learn-with-clara-letters-find-a",
  "learn-with-clara-letters-find-b",
  "learn-with-clara-letters-find-c",
  "learn-with-clara-letters-find-d",
  "learn-with-clara-letters-find-e",
  "learn-with-clara-letters-parade-finale",
  "lesson-1-letter-demo-A",
  "lesson-1-letter-demo-B",
  "lesson-1-letter-demo-C",
  "lesson-1-letter-demo-D",
  "lesson-1-letter-demo-E",
]);

const lettersStateSchema = z.object({
  session_id: z.number().int().positive(),
  lesson_key: z.literal("letters"),
  chapter_key: z.literal("letter-names-a-e"),
  status: z.enum(["active", "letters-complete"]),
  visit_count: z.number().int().positive(),
  scene: z.object({
    key: z.string(),
    kind: z.enum(["story", "find", "teach", "completion"]),
    title: z.string(),
    display_text: z.string(),
    pronunciation: z.string(),
    speech_key: lettersSpeechKeySchema,
    choices: z.array(z.string().length(1)),
    item_progress: z
      .object({
        current: z.number().int().min(1).max(5),
        total: z.literal(5),
      })
      .nullable(),
  }),
  prefetch_speech_keys: z.array(lettersSpeechKeySchema),
});

export type LearnWithClaraLettersState = z.infer<typeof lettersStateSchema>;
export type LearnWithClaraLettersScene = LearnWithClaraLettersState["scene"];

const headers = (token: string): HeadersInit => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

async function parse(response: Response): Promise<LearnWithClaraLettersState> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new Error(
      typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
        ? body.message
        : "Ma'am Clara could not save your letters class.",
    );
  }

  return lettersStateSchema.parse(await response.json());
}

export async function startLearnWithClaraLetters(token: string) {
  return parse(
    await fetch("/api/learners/learn-with-clara/letters/start", {
      method: "POST",
      headers: headers(token),
    }),
  );
}

export async function advanceLearnWithClaraLetters(
  token: string,
  sceneKey: string,
) {
  return parse(
    await fetch("/api/learners/learn-with-clara/letters/advance", {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        scene_key: sceneKey,
        action: "continue",
      }),
    }),
  );
}

export async function restartLearnWithClaraLetters(token: string) {
  return parse(
    await fetch("/api/learners/learn-with-clara/letters/restart", {
      method: "POST",
      headers: headers(token),
    }),
  );
}
