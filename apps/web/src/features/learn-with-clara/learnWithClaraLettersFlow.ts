import type { ClaraSpeechKey } from "../clara-audio/claraSpeech";

export type LearnWithClaraLettersScene = {
  key: string;
  kind: "story" | "find" | "teach" | "completion";
  title: string;
  display_text: string;
  pronunciation: string;
  speech_key: ClaraSpeechKey;
  choices: string[];
  item_progress: { current: number; total: 5 } | null;
};

export type LearnWithClaraLettersState = {
  status: "active" | "letters-complete";
  scene: LearnWithClaraLettersScene;
  prefetch_speech_keys: ClaraSpeechKey[];
};

const scenes: Record<string, LearnWithClaraLettersScene> = {
  "parade-opening": {
    key: "parade-opening",
    kind: "story",
    title: "The little letters blew away",
    display_text: "A B C D E",
    pronunciation: "",
    speech_key: "learn-with-clara-letters-parade-opening",
    choices: [],
    item_progress: { current: 1, total: 5 },
  },
  "find-a": {
    key: "find-a",
    kind: "find",
    title: "Find little a",
    display_text: "A a",
    pronunciation: "ay",
    speech_key: "learn-with-clara-letters-find-a",
    choices: ["d", "a", "e"],
    item_progress: { current: 1, total: 5 },
  },
  "teach-a": {
    key: "teach-a",
    kind: "teach",
    title: "A found its partner",
    display_text: "A a",
    pronunciation: "ay",
    speech_key: "lesson-1-letter-demo-A",
    choices: [],
    item_progress: { current: 1, total: 5 },
  },
  "find-b": {
    key: "find-b",
    kind: "find",
    title: "Find little b",
    display_text: "B b",
    pronunciation: "bee",
    speech_key: "learn-with-clara-letters-find-b",
    choices: ["p", "b", "d"],
    item_progress: { current: 2, total: 5 },
  },
  "teach-b": {
    key: "teach-b",
    kind: "teach",
    title: "B found its partner",
    display_text: "B b",
    pronunciation: "bee",
    speech_key: "lesson-1-letter-demo-B",
    choices: [],
    item_progress: { current: 2, total: 5 },
  },
  "find-c": {
    key: "find-c",
    kind: "find",
    title: "Find little c",
    display_text: "C c",
    pronunciation: "see",
    speech_key: "learn-with-clara-letters-find-c",
    choices: ["o", "e", "c"],
    item_progress: { current: 3, total: 5 },
  },
  "teach-c": {
    key: "teach-c",
    kind: "teach",
    title: "C found its partner",
    display_text: "C c",
    pronunciation: "see",
    speech_key: "lesson-1-letter-demo-C",
    choices: [],
    item_progress: { current: 3, total: 5 },
  },
  "find-d": {
    key: "find-d",
    kind: "find",
    title: "Find little d",
    display_text: "D d",
    pronunciation: "dee",
    speech_key: "learn-with-clara-letters-find-d",
    choices: ["b", "q", "d"],
    item_progress: { current: 4, total: 5 },
  },
  "teach-d": {
    key: "teach-d",
    kind: "teach",
    title: "D found its partner",
    display_text: "D d",
    pronunciation: "dee",
    speech_key: "lesson-1-letter-demo-D",
    choices: [],
    item_progress: { current: 4, total: 5 },
  },
  "find-e": {
    key: "find-e",
    kind: "find",
    title: "Find little e",
    display_text: "E e",
    pronunciation: "ee",
    speech_key: "learn-with-clara-letters-find-e",
    choices: ["c", "e", "a"],
    item_progress: { current: 5, total: 5 },
  },
  "teach-e": {
    key: "teach-e",
    kind: "teach",
    title: "E found its partner",
    display_text: "E e",
    pronunciation: "ee",
    speech_key: "lesson-1-letter-demo-E",
    choices: [],
    item_progress: { current: 5, total: 5 },
  },
  "parade-finale": {
    key: "parade-finale",
    kind: "completion",
    title: "The Letter Parade",
    display_text: "A a B b C c D d E e",
    pronunciation: "",
    speech_key: "learn-with-clara-letters-parade-finale",
    choices: [],
    item_progress: null,
  },
};

const sceneOrder = [
  "parade-opening",
  "find-a",
  "teach-a",
  "find-b",
  "teach-b",
  "find-c",
  "teach-c",
  "find-d",
  "teach-d",
  "find-e",
  "teach-e",
  "parade-finale",
] as const;

function stateFor(sceneKey: (typeof sceneOrder)[number]): LearnWithClaraLettersState {
  const nextSceneKey = sceneOrder[sceneOrder.indexOf(sceneKey) + 1];

  return {
    status: sceneKey === "parade-finale" ? "letters-complete" : "active",
    scene: scenes[sceneKey],
    prefetch_speech_keys: nextSceneKey ? [scenes[nextSceneKey].speech_key] : [],
  };
}

export function startLearnWithClaraLetters(): LearnWithClaraLettersState {
  return stateFor("parade-opening");
}

export function advanceLearnWithClaraLetters(
  state: LearnWithClaraLettersState,
): LearnWithClaraLettersState {
  const position = sceneOrder.indexOf(
    state.scene.key as (typeof sceneOrder)[number],
  );
  const nextSceneKey = sceneOrder[position + 1];

  return nextSceneKey ? stateFor(nextSceneKey) : state;
}
