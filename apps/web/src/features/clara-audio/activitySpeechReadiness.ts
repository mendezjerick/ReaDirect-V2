import { z } from "zod";

import { apiFetchWithNormalTimeout as apiFetch } from "../../lib/apiUrl";

const activitySpeechManifestSchema = z.object({
  activity: z.string().min(1),
  published_groups: z.array(z.string()),
  published_speech_keys: z.array(z.string()),
  runtime_profiles: z.array(z.string()),
  requires_runtime: z.boolean(),
});

const activitySpeechReadinessSchema = z.object({
  activity: z.string().min(1),
  ready: z.boolean(),
  published_ready: z.boolean(),
  published_groups: z.array(z.string()),
  voice_version: z.string().nullable(),
  unavailable_speech_keys: z.array(z.string()),
  runtime_required: z.boolean(),
  runtime_ready: z.boolean(),
  runtime_profiles: z.array(z.string()),
  profiles_ready: z.array(z.string()),
  device: z.string().nullable(),
  message: z.string().optional(),
});

export type ActivitySpeechManifest = z.infer<
  typeof activitySpeechManifestSchema
>;
export type ActivitySpeechReadiness = z.infer<
  typeof activitySpeechReadinessSchema
>;

interface CachedRequest<T> {
  createdAt: number;
  promise: Promise<T>;
}

const REQUEST_TTL_MS = 60_000;
const manifestRequests = new Map<
  string,
  CachedRequest<ActivitySpeechManifest>
>();
const readinessRequests = new Map<
  string,
  CachedRequest<ActivitySpeechReadiness>
>();

function cacheKey(token: string, activity: string): string {
  return `${token}:${activity}`;
}

function cachedRequest<T>(
  requests: Map<string, CachedRequest<T>>,
  key: string,
  request: () => Promise<T>,
): Promise<T> {
  const existing = requests.get(key);

  if (existing && Date.now() - existing.createdAt < REQUEST_TTL_MS) {
    return existing.promise;
  }

  const promise = request();
  requests.set(key, { createdAt: Date.now(), promise });
  void promise.catch(() => requests.delete(key));

  return promise;
}

function responseMessage(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return "Ma'am Clara could not prepare this activity yet.";
}

export function getActivitySpeechManifest(
  token: string,
  activity: string,
): Promise<ActivitySpeechManifest> {
  const key = cacheKey(token, activity);

  return cachedRequest(manifestRequests, key, async () => {
    const response = await apiFetch(
      `/api/learners/tts/activity-manifest?activity=${encodeURIComponent(activity)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(responseMessage(body));
    }

    const manifest = activitySpeechManifestSchema.parse(body);

    if (manifest.activity !== activity) {
      throw new Error("Ma'am Clara returned an invalid activity status.");
    }

    return manifest;
  });
}

export function prepareActivitySpeech(
  token: string,
  activity: string,
): Promise<ActivitySpeechReadiness> {
  const key = cacheKey(token, activity);

  return cachedRequest(readinessRequests, key, async () => {
    await getActivitySpeechManifest(token, activity);
    const response = await apiFetch("/api/learners/tts/activity-readiness", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activity }),
    });
    const body: unknown = await response.json().catch(() => null);
    const parsed = activitySpeechReadinessSchema.safeParse(body);

    if (!parsed.success) {
      throw new Error(
        response.ok
          ? "Ma'am Clara returned an invalid activity status."
          : responseMessage(body),
      );
    }

    if (parsed.data.activity !== activity) {
      throw new Error("Ma'am Clara returned an invalid activity status.");
    }

    if (!response.ok || !parsed.data.ready) {
      throw new Error(
        parsed.data.message ?? "Ma'am Clara could not prepare this activity.",
      );
    }

    return parsed.data;
  });
}

export function clearActivitySpeechPreparation(
  token?: string,
  activity?: string,
): void {
  const exactKey = token && activity ? cacheKey(token, activity) : null;
  const tokenPrefix = token ? `${token}:` : null;

  for (const requests of [manifestRequests, readinessRequests]) {
    for (const key of requests.keys()) {
      if (
        exactKey === key ||
        (!exactKey && tokenPrefix && key.startsWith(tokenPrefix)) ||
        (!tokenPrefix && !exactKey)
      ) {
        requests.delete(key);
      }
    }
  }
}
