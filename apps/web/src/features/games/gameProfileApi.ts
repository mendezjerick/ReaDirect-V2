import { z } from "zod";

import { apiFetchWithNormalTimeout, apiUrl } from "../../lib/apiUrl";
import {
  GameProfileRequestError,
  type GameProfile,
  type GameProfileClient,
} from "@readirect/game-lobby";
import { loadLearnerSession } from "../learner-auth/learnerApi";

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

export const learnerGameProfileClient: GameProfileClient = {
  async loadGameProfile() {
    const response = await apiFetchWithNormalTimeout(apiUrl(GAME_PROFILE_URL), {
      headers: headers(),
    });
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
