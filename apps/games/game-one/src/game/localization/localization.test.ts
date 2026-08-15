import { beforeEach, describe, expect, it } from "vitest";
import { getMission, getMissions, MISSIONS } from "../content/missions";
import { loadMissionProgress, saveMissionProgress } from "../mission/missionPersistence";
import { createInitialMissionState, missionReducer } from "../mission/missionState";
import { createMissionRounds, createSeededRandom } from "../questions/questionRound";
import { loadLanguagePreference, saveLanguagePreference } from "./language";

describe("bilingual ReaDirect content", () => {
  beforeEach(() => localStorage.clear());

  it("provides complete Filipino mission content with the same stable gameplay IDs", () => {
    const english = getMissions("en");
    const filipino = getMissions("fil");
    expect(filipino).toHaveLength(english.length);

    english.forEach((mission, missionIndex) => {
      const translated = filipino[missionIndex];
      expect(translated.id).toBe(mission.id);
      expect(translated.objective).not.toBe(mission.objective);
      expect(translated.reading.pages).toHaveLength(mission.reading.pages.length);
      expect(translated.action.correctChoiceId).toBe(mission.action.correctChoiceId);
      expect(translated.action.choices.map(({ id }) => id)).toEqual(mission.action.choices.map(({ id }) => id));
      expect(translated.questions.map(({ id }) => id)).toEqual(mission.questions.map(({ id }) => id));
      translated.questions.forEach((question, questionIndex) => {
        const source = mission.questions[questionIndex];
        expect(question.correctChoiceId).toBe(source.correctChoiceId);
        expect(question.choices.map(({ id }) => id)).toEqual(source.choices.map(({ id }) => id));
        expect(question.prompt).not.toMatch(/\[missing|translation_key/i);
      });
    });
  });

  it("serves the shortened Grade 3 story text in both languages", () => {
    expect(getMission("market-supplies", "en").reading.pages[1]).toBe(
      "Pack the cloth first. Add the pitchers second. Put the mangoes on top. Take the crate to Lolo Ambo."
    );
    expect(getMission("market-supplies", "fil").reading.pages[1]).toBe(
      "Ilagay muna ang tela. Isunod ang mga pitsel. Ilagay sa ibabaw ang mga mangga. Dalhin ang kahon kay Lolo Ambo."
    );
  });

  it("uses short questions and simple modern Filipino words", () => {
    const formalWords = /\b(liwasan|hudyat|rehas|paunawa|panlabas|patungo|mantel|tala|palatandaan|paglalakbay|panganib|kagamitan|tuntunin|hinuha)\b/i;

    for (const mission of getMissions("fil")) {
      for (const question of mission.questions) {
        expect(question.prompt.trim().split(/\s+/).length).toBeLessThanOrEqual(7);
        expect([question.prompt, ...question.choices.map(({ text }) => text)].join(" ")).not.toMatch(formalWords);
      }
    }
  });

  it("changes language without changing the active item, choice order, attempts, or answer", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(25));
    let state = createInitialMissionState(rounds, "en");
    state = missionReducer(state, { type: "TALK_TO_NPC", npcId: "miss-estelle" });
    state = missionReducer(state, { type: "SKIP_DIALOGUE" });
    state = missionReducer(state, { type: "START_READING" });
    state = missionReducer(state, { type: "NEXT_READING_PAGE" });
    state = missionReducer(state, { type: "FINISH_STORY" });
    state = missionReducer(state, { type: "BEGIN_MISSION_ACTION" });
    state = missionReducer(state, { type: "SUBMIT_MISSION_ACTION", choiceId: getMission("plaza-welcome").action.correctChoiceId });
    state = missionReducer(state, { type: "CONTINUE_AFTER_ACTION" });
    state = missionReducer(state, { type: "START_QUESTIONS" });
    const question = state.round.questions[0];
    const wrong = question.choices.find(({ id }) => id !== question.correctChoiceId)!;
    state = missionReducer(state, { type: "SELECT_ANSWER", choiceId: wrong.id });
    state = missionReducer(state, { type: "SUBMIT_ANSWER", choiceId: wrong.id });

    const idsBefore = state.round.questions.map(({ id, choices }) => ({ id, choices: choices.map((choice) => choice.id) }));
    const attemptsBefore = state.attemptsByQuestion;
    const switched = missionReducer(state, { type: "SET_LANGUAGE", language: "fil" });

    expect(switched.language).toBe("fil");
    expect(switched.currentQuestionIndex).toBe(state.currentQuestionIndex);
    expect(switched.selectedChoiceId).toBe(wrong.id);
    expect(switched.attemptsByQuestion).toEqual(attemptsBefore);
    expect(switched.completedQuestionIds).toEqual(state.completedQuestionIds);
    expect(switched.round.questions.map(({ id, choices }) => ({ id, choices: choices.map((choice) => choice.id) }))).toEqual(idsBefore);
    expect(switched.round.questions[0].prompt).not.toBe(question.prompt);
    expect(switched.round.questions[0].correctChoiceId).toBe(question.correctChoiceId);
  });

  it("restores the selected language with mission progress", () => {
    const englishRounds = createMissionRounds(getMissions("en"), createSeededRandom(4));
    const filipinoRounds = createMissionRounds(getMissions("fil"), createSeededRandom(4));
    const state = createInitialMissionState(filipinoRounds, "fil");
    saveMissionProgress(state);
    const restored = loadMissionProgress(englishRounds);
    expect(restored?.language).toBe("fil");
    expect(restored?.round.questions[0].id).toBe(state.round.questions[0].id);
  });

  it("keeps suggested language preferences isolated by profile scope", () => {
    saveLanguagePreference("en", localStorage, "learner-a");
    saveLanguagePreference("fil", localStorage, "learner-b");
    expect(loadLanguagePreference(localStorage, "learner-a")).toBe("en");
    expect(loadLanguagePreference(localStorage, "learner-b")).toBe("fil");
  });
});
