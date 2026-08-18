import { z } from "zod";

import { apiFetchWithNormalTimeout as fetch } from "../../lib/apiUrl";

import type {
  GameOneHostAdapter,
  GameOneGameProfile,
  GameOneRemoteSave,
  GameOneSaveRequest,
} from "@readirect/game-one";

const remoteSaveSchema = z.object({
  checkpoint_key: z.string(),
  save_schema_version: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  revision: z.number().int().nonnegative(),
  saved_at: z.string(),
});

const saveResponseSchema = z.object({
  game_key: z.literal("chronicles-of-the-lost-kingdom"),
  save: remoteSaveSchema.nullable(),
});

const GAME_ONE_SAVE_URL =
  "/api/learners/games/chronicles-of-the-lost-kingdom/save";
const GAME_ONE_NEW_GAME_URL =
  "/api/learners/games/chronicles-of-the-lost-kingdom/new-game";

export function createGameOneHostAdapter({
  token,
  profile = null,
}: {
  token: string;
  profile?: GameOneGameProfile | null;
}): GameOneHostAdapter {
  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const requestSave = () => fetch(GAME_ONE_SAVE_URL, { headers });

  return {
    profile,
    async load() {
      return parseSaveResponse(await requestSave());
    },

    async save(request: GameOneSaveRequest) {
      const response = await fetch(GAME_ONE_SAVE_URL, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          checkpoint_key: request.checkpointKey,
          save_schema_version: request.saveSchemaVersion,
          state: request.state,
          expected_revision: request.expectedRevision,
        }),
      });
      const save = await parseSaveResponse(response);

      if (save === null) {
        throw new Error("The Game One save response was empty.");
      }

      return save;
    },

    async newGame(expectedRevision: number) {
      const response = await fetch(GAME_ONE_NEW_GAME_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ expected_revision: expectedRevision }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      saveResponseSchema.parse(await response.json());
    },
  };
}

async function parseSaveResponse(
  response: Response,
): Promise<GameOneRemoteSave | null> {
  if (!response.ok) {
    throw new Error(await responseError(response));
  }

  const parsed = saveResponseSchema.parse(await response.json());
  if (parsed.save === null) return null;

  return {
    checkpointKey: parsed.save.checkpoint_key,
    saveSchemaVersion: parsed.save.save_schema_version,
    state: parsed.save.state,
    revision: parsed.save.revision,
    savedAt: parsed.save.saved_at,
  };
}

async function responseError(response: Response): Promise<string> {
  if (response.status >= 500) {
    return "ReaDirect could not access Game One progress.";
  }

  const body: unknown = await response.json().catch(() => null);

  if (response.status === 401) {
    return "Your learner session expired. Sign in again before playing.";
  }
  if (response.status === 403) {
    return "Persistent Game One progress is unavailable for this session.";
  }
  if (response.status === 404) {
    return "Game One persistence is not active yet.";
  }
  if (response.status === 409) {
    return "Game One progress changed elsewhere. Reload before continuing.";
  }

  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return "ReaDirect could not access Game One progress.";
}
