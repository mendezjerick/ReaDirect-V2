import { describe, expect, it } from "vitest";

import { MISSIONS } from "../content/missions";
import { createMissionRounds, createSeededRandom } from "../questions/questionRound";
import {
  createGameOneSaveState,
  createInitialGameOneProgress,
  GAME_ONE_SAVE_SCHEMA_VERSION,
  hydrateGameOneProgress
} from "./gameOneSaveContract";

describe("Game One save contract", () => {
  it("round-trips learner progress through the versioned server state", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(17));
    const initial = createInitialGameOneProgress(rounds, "fil");
    const state = createGameOneSaveState(
      { ...initial.mission, missionIndex: 1 },
      { ...initial.exploration, fishingParticipation: 2 },
      { ...initial.tutorial, active: false, finished: true }
    );

    const hydrated = hydrateGameOneProgress(
      {
        checkpointKey: "mission-2",
        saveSchemaVersion: GAME_ONE_SAVE_SCHEMA_VERSION,
        state,
        revision: 8,
        savedAt: "2026-07-26T08:00:00Z"
      },
      rounds,
      "en"
    );

    expect(hydrated.revision).toBe(8);
    expect(hydrated.mission.missionIndex).toBe(1);
    expect(hydrated.mission.language).toBe("fil");
    expect(hydrated.exploration.fishingParticipation).toBe(2);
    expect(hydrated.tutorial.finished).toBe(true);
    expect(JSON.stringify(state)).not.toMatch(
      /access_token|authorization|bearer_token|learner_code|learner_id|password|username/i
    );
    expect(new TextEncoder().encode(JSON.stringify(state)).byteLength).toBeLessThan(
      262_144
    );
  });

  it("starts clean instead of importing anonymous browser progress", () => {
    localStorage.setItem(
      "readirect-rpg:mission-progress:v1",
      JSON.stringify({ version: 1, state: { missionIndex: 3 } })
    );
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(21));

    const hydrated = hydrateGameOneProgress(null, rounds, "en");

    expect(hydrated.revision).toBe(0);
    expect(hydrated.mission.missionIndex).toBe(0);
    expect(hydrated.exploration.fishingParticipation).toBe(0);
    expect(hydrated.tutorial.active).toBe(true);
  });

  it("refuses incompatible or unsafe server saves before they can be overwritten", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(5));
    const initial = createInitialGameOneProgress(rounds, "en");
    const validState = createGameOneSaveState(
      initial.mission,
      initial.exploration,
      initial.tutorial
    );

    expect(() => hydrateGameOneProgress(
      {
        checkpointKey: "mission-1",
        saveSchemaVersion: 2,
        state: validState,
        revision: 1,
        savedAt: "2026-07-26T08:00:00Z"
      },
      rounds,
      "en"
    )).toThrow(/unsupported schema/i);

    expect(() => hydrateGameOneProgress(
      {
        checkpointKey: "mission-1",
        saveSchemaVersion: 1,
        state: { ...validState, exploration: { version: 1, safePosition: { x: 64, y: 288 } } },
        revision: 1,
        savedAt: "2026-07-26T08:00:00Z"
      },
      rounds,
      "en"
    )).toThrow(/restored safely/i);
  });
});
