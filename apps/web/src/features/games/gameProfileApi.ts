import { z } from "zod";

import { apiFetchWithNormalTimeout, apiUrl } from "../../lib/apiUrl";
import {
  GameProfileRequestError,
  type GameProfile,
  type GameProfileClient,
} from "@readirect/game-lobby";
import {
  loadLearnerSession,
  restoreLearnerSession,
  saveLearnerSession,
} from "../learner-auth/learnerApi";

const gameProfileSchema = z.object({
  audience: z.literal("learner"),
  username: z.string(),
  discriminator: z.string().regex(/^\d{4}$/),
  public_handle: z.string(),
  is_active: z.boolean(),
});

const gameProfileResponseSchema = z.object({
  profile: gameProfileSchema.nullable(),
});

const GAME_PROFILE_URL = "/api/learners/games/profile";

function headers(): HeadersInit {
  const token = loadLearnerSession()?.token;
  if (!token) {
    throw new GameProfileRequestError(
      "Your learner session is no longer valid.",
      401,
    );
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function parseProfile(responseBody: unknown): GameProfile | null {
  const parsed = gameProfileResponseSchema.parse(responseBody);
  if (parsed.profile === null) return null;

  return {
    audience: parsed.profile.audience,
    username: parsed.profile.username,
    discriminator: parsed.profile.discriminator,
    publicHandle: parsed.profile.public_handle,
    isActive: parsed.profile.is_active,
  };
}

async function requestError(
  response: Response,
): Promise<GameProfileRequestError> {
  const body: unknown = await response.json().catch(() => null);
  const validationMessage =
    body &&
    typeof body === "object" &&
    "errors" in body &&
    body.errors &&
    typeof body.errors === "object" &&
    "username" in body.errors &&
    Array.isArray(body.errors.username) &&
    typeof body.errors.username[0] === "string"
      ? body.errors.username[0]
      : null;
  const message =
    validationMessage ??
    (body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string"
      ? body.message
      : response.status === 401
        ? "Your learner session is no longer valid."
        : "ReaDirect could not complete that game profile request.");

  return new GameProfileRequestError(message, response.status);
}

/**
 * Browser sessions use a non-secret sentinel in storage and the real identity
 * in an HttpOnly cookie. A different tab can replace that cookie (for example
 * when opening a page portal) while this tab still has the previous learner
 * snapshot. Reconcile that authoritative cookie once before surfacing a
 * profile failure so preview/standard mode and profile requests agree.
 */
async function reconcileBrowserSession(): Promise<boolean> {
  const stored = loadLearnerSession();
  if (stored?.token !== "cookie-session") return false;

  const restored = await restoreLearnerSession();
  if (!restored) return false;

  await saveLearnerSession(restored);
  return true;
}

async function loadProfileResponse(): Promise<Response> {
  let response = await apiFetchWithNormalTimeout(apiUrl(GAME_PROFILE_URL), {
    headers: headers(),
  });

  if (
    !response.ok &&
    (response.status === 401 || response.status === 403) &&
    loadLearnerSession()?.token === "cookie-session"
  ) {
    const reconciled = await reconcileBrowserSession();
    if (reconciled) {
      response = await apiFetchWithNormalTimeout(apiUrl(GAME_PROFILE_URL), {
        headers: headers(),
      });
    }
  }

  return response;
}

export const learnerGameProfileClient: GameProfileClient = {
  async loadGameProfile() {
    const response = await loadProfileResponse();
    if (!response.ok) throw await requestError(response);
    return parseProfile(await response.json());
  },

  async createGameProfile(username: string) {
    const response = await apiFetchWithNormalTimeout(apiUrl(GAME_PROFILE_URL), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ username: username.trim() }),
    });
    if (!response.ok) throw await requestError(response);

    const profile = parseProfile(await response.json());
    if (profile === null) {
      throw new Error("ReaDirect returned an empty game profile.");
    }
    return profile;
  },
};
