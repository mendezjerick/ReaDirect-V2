import { describe, expect, it } from "vitest";
import { MISSIONS } from "./missions";
import { NPC_IDS } from "./npcs";
import { getLoreAssignments, LORE_ASSIGNMENTS } from "./lore";

describe("Lost Kingdom mission team", () => {
  it("gives every character one bounded reading-mission task", () => {
    expect(LORE_ASSIGNMENTS.map(({ npcId }) => npcId).sort()).toEqual([...NPC_IDS].sort());

    for (const assignment of LORE_ASSIGNMENTS) {
      expect(assignment.task.en).toBeTruthy();
      expect(assignment.task.fil).toBeTruthy();
      expect(assignment.questionIds.length).toBeGreaterThan(0);
    }
  });

  it("links each character task to an existing comprehension question", () => {
    for (const assignment of LORE_ASSIGNMENTS) {
      const mission = MISSIONS.find(({ id }) => id === assignment.missionId)!;
      const questionIds = mission.questions.map(({ id }) => id);

      expect(getLoreAssignments(assignment.missionId)).toContain(assignment);
      expect(assignment.questionIds.every((id) => questionIds.includes(id))).toBe(true);
    }
  });
});
