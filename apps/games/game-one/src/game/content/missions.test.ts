import { describe, expect, it } from "vitest";
import { NPC_IDS } from "./npcs";
import { MISSION_IDS, MISSIONS } from "./missions";

describe("centralized reading journey content", () => {
  it("uses the required six-mission order and only existing NPCs", () => {
    expect(MISSIONS.map(({ id }) => id)).toEqual(MISSION_IDS);
    expect(MISSIONS.map(({ order }) => order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(MISSIONS.every(({ npcId }) => NPC_IDS.includes(npcId))).toBe(true);
    expect(new Set(MISSIONS.map(({ npcId }) => npcId)).size).toBeGreaterThanOrEqual(4);
  });

  it("connects each mission to the next and closes the final journey", () => {
    MISSIONS.slice(0, -1).forEach((mission, index) => {
      expect(mission.nextMissionId).toBe(MISSIONS[index + 1].id);
    });
    expect(MISSIONS.at(-1)?.nextMissionId).toBeNull();
  });

  it("gives every reading a gameplay purpose, action, support, and visible result", () => {
    for (const mission of MISSIONS) {
      expect(mission.situation.length).toBeGreaterThan(20);
      expect(mission.objective).toBeTruthy();
      expect(mission.reading.title).toBeTruthy();
      expect(mission.reading.pages.join(" ").length).toBeGreaterThan(100);
      expect(mission.facts.length).toBeGreaterThanOrEqual(3);
      expect(mission.requiredInteractions.length).toBeGreaterThanOrEqual(3);
      expect(mission.action.choices).toHaveLength(4);
      expect(mission.action.hint).toBeTruthy();
      expect(mission.completionCondition).toBeTruthy();
      expect(mission.worldResult).toBeTruthy();
      expect(mission.reward).toBeTruthy();
    }
  });

  it("provides self-contained question support and contextual feedback", () => {
    for (const mission of MISSIONS) {
      for (const question of mission.questions) {
        expect(question.choices).toHaveLength(4);
        expect(question.hint).toBeTruthy();
        expect(question.explanation).toBeTruthy();
        expect(question.correctFeedback).toBeTruthy();
        expect(question.incorrectFeedback).toBeTruthy();
        expect(mission.reading.pages.join(" ").toLowerCase()).not.toContain("ana and ben");
      }
    }
  });

  it("increases from direct retrieval to sequence, cause, inference, and main idea", () => {
    expect(MISSIONS[0].questions.map(({ skill }) => skill)).toEqual(expect.arrayContaining(["where", "sequence"]));
    expect(MISSIONS[3].questions.map(({ skill }) => skill)).toContain("cause-and-effect");
    expect(MISSIONS[4].questions.map(({ skill }) => skill)).toContain("inference");
    expect(MISSIONS[5].questions.map(({ skill }) => skill)).toContain("main-idea");
  });
});
