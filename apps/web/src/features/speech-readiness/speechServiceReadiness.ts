import { z } from "zod";

import { apiFetchWithNormalTimeout } from "../../lib/apiUrl";

const speechServiceReadinessSchema = z.object({
  asr: z.enum(["online", "offline"]),
  tts: z.enum(["online", "offline"]),
});

export type SpeechServiceReadiness = z.infer<
  typeof speechServiceReadinessSchema
>;

export async function getSpeechServiceReadiness(
  signal?: AbortSignal,
): Promise<SpeechServiceReadiness> {
  const response = await apiFetchWithNormalTimeout("/api/speech/readiness", {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error("Speech service readiness could not be checked.");
  }

  return speechServiceReadinessSchema.parse(await response.json());
}
