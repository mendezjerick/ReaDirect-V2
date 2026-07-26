import { describe, expect, it } from "vitest";
import { getMission, MISSIONS, type MissionDefinition } from "../content/missions";
import { createMissionRounds, createQuestionRound, createSeededRandom, validateQuestionBank } from "./questionRound";

const mission = getMission("market-supplies");

describe("randomized contextual question rounds", () => {
  it("prepares one ordered round for each mission", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(10));
    expect(rounds.map(({ missionId }) => missionId)).toEqual(MISSIONS.map(({ id }) => id));
    expect(rounds.every((round) => round.questions.length > 0)).toBe(true);
  });

  it("uses every mission question and shuffles the order", () => {
    const round = createQuestionRound(mission, { rng: createSeededRandom(21) });
    expect(round.questions).toHaveLength(mission.questions.length);
    expect(new Set(round.questions.map(({ id }) => id)).size).toBe(mission.questions.length);
    expect(round.questions.every((question) => question.missionId === mission.id)).toBe(true);
  });

  it("preserves exactly four unique choices and one correct answer", () => {
    for (const current of MISSIONS) {
      validateQuestionBank(current);
      const round = createQuestionRound(current, { rng: createSeededRandom(current.order) });
      for (const question of round.questions) {
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices.map(({ text }) => text.toLowerCase())).size).toBe(4);
        expect(question.choices.filter(({ id }) => id === question.correctChoiceId)).toHaveLength(1);
      }
    }
  });

  it("is reproducible for a fixed seed and varies across seeds", () => {
    const first = createMissionRounds(MISSIONS, createSeededRandom(77));
    expect(createMissionRounds(MISSIONS, createSeededRandom(77))).toEqual(first);
    expect(createMissionRounds(MISSIONS, createSeededRandom(78))).not.toEqual(first);
  });

  it("does not permanently tie correct answers to one letter", () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 12; seed += 1) {
      const round = createQuestionRound(mission, { rng: createSeededRandom(seed) });
      for (const question of round.questions) {
        positions.add(question.choices.findIndex(({ id }) => id === question.correctChoiceId));
      }
    }
    expect(positions.size).toBeGreaterThan(2);
  });

  it("rejects invalid question choice sets", () => {
    const invalid: MissionDefinition = {
      ...mission,
      questions: [{ ...mission.questions[0], choices: mission.questions[0].choices.slice(0, 3) }]
    };
    expect(() => validateQuestionBank(invalid)).toThrow(/exactly four choices/i);
  });
});
