import { z } from "zod";

import type {
  GameTwoGameProfile,
  GameTwoHostAdapter,
  GameTwoRemoteSave,
  GameTwoSaveRequest,
} from "@readirect/game-two";
import { apiFetchWithNormalTimeout as fetch } from "../../lib/apiUrl";

const remoteSaveSchema = z.object({
  checkpoint_key: z.string(),
  save_schema_version: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  revision: z.number().int().nonnegative(),
  saved_at: z.string(),
});
const saveResponseSchema = z.object({
  game_key: z.literal("ottertale"),
  save: remoteSaveSchema.nullable(),
});
const saveUrl = "/api/learners/games/ottertale/save";
const newGameUrl = "/api/learners/games/ottertale/new-game";

export function createGameTwoHostAdapter({
  token,
  profile = null,
}: {
  token: string;
  profile?: GameTwoGameProfile | null;
}): GameTwoHostAdapter {
  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const parse = async (
    response: Response,
  ): Promise<GameTwoRemoteSave | null> => {
    if (!response.ok) throw new Error(await responseError(response));
    const parsed = saveResponseSchema.parse(await response.json());
    if (parsed.save === null) return null;
    return {
      checkpointKey: parsed.save.checkpoint_key,
      saveSchemaVersion: parsed.save.save_schema_version,
      state: parsed.save.state,
      revision: parsed.save.revision,
      savedAt: parsed.save.saved_at,
    };
  };

  return {
    profile,
    async load() {
      return parse(await fetch(saveUrl, { headers }));
    },
    async save(request: GameTwoSaveRequest) {
      const save = await parse(
        await fetch(saveUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            checkpoint_key: request.checkpointKey,
            save_schema_version: request.saveSchemaVersion,
            state: request.state,
            expected_revision: request.expectedRevision,
          }),
        }),
      );
      if (save === null) {
        throw new Error("The OtterTale save response was empty.");
      }
      return save;
    },
    async newGame(expectedRevision: number) {
      const response = await fetch(newGameUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ expected_revision: expectedRevision }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      saveResponseSchema.parse(await response.json());
    },
  };
}

async function responseError(response: Response): Promise<string> {
  if (response.status >= 500) {
    return "ReaDirect could not access OtterTale progress.";
  }
  if (response.status === 401) {
    return "Your learner session expired. Sign in again before playing.";
  }
  if (response.status === 403) {
    return "Persistent OtterTale progress is unavailable for this session.";
  }
  if (response.status === 404) {
    return "OtterTale persistence is not active yet.";
  }
  if (response.status === 409) {
    return "OtterTale progress changed elsewhere. Reload before continuing.";
  }
  const body: unknown = await response.json().catch(() => null);
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }
  return "ReaDirect could not access OtterTale progress.";
}
