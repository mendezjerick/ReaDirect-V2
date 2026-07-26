import type {
  MissionChoice,
  MissionDefinition,
  MissionId,
  MissionQuestion
} from "../content/missions";

export type RandomSource = () => number;

export type RoundQuestion = Omit<MissionQuestion, "choices"> & {
  choices: readonly MissionChoice[];
};

export type QuestionRound = {
  missionId: MissionId;
  questions: readonly RoundQuestion[];
};

export type CreateQuestionRoundOptions = {
  count?: number;
  rng: RandomSource;
  previousQuestionIds?: readonly string[];
};

export function createQuestionRound(
  mission: MissionDefinition,
  { count = mission.questions.length, rng, previousQuestionIds = [] }: CreateQuestionRoundOptions
): QuestionRound {
  validateQuestionBank(mission);
  if (!Number.isInteger(count) || count < 1 || count > mission.questions.length) {
    throw new Error(
      `Cannot create a round of ${count} from ${mission.questions.length} questions for ${mission.id}.`
    );
  }

  const previous = new Set(previousQuestionIds);
  const unused = mission.questions.filter((question) => !previous.has(question.id));
  const source = unused.length >= count ? unused : mission.questions;
  const selected = shuffle(source, rng).slice(0, count);
  return {
    missionId: mission.id,
    questions: shuffle(selected, rng).map((question) => ({
      ...question,
      choices: shuffle(question.choices, rng)
    }))
  };
}

export function createMissionRounds(
  missions: readonly MissionDefinition[],
  rng: RandomSource,
  previousRounds: readonly QuestionRound[] = []
) {
  return missions.map((mission) =>
    createQuestionRound(mission, {
      rng,
      previousQuestionIds: previousRounds.find((round) => round.missionId === mission.id)?.questions.map(({ id }) => id)
    })
  );
}

export function createSeededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSessionRandom(): RandomSource {
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues(values);
  return createSeededRandom(values[0] || Date.now());
}

export function validateQuestionBank(mission: MissionDefinition) {
  const questionIds = new Set<string>();
  for (const question of mission.questions) {
    if (question.missionId !== mission.id) {
      throw new Error(`Question ${question.id} does not belong to mission ${mission.id}.`);
    }
    if (questionIds.has(question.id)) throw new Error(`Duplicate question ID: ${question.id}.`);
    questionIds.add(question.id);
    validateChoices(question.id, question.choices, question.correctChoiceId);
  }
  validateChoices(`${mission.id} action`, mission.action.choices, mission.action.correctChoiceId);
}

function validateChoices(id: string, choices: readonly MissionChoice[], correctChoiceId: string) {
  if (choices.length !== 4) throw new Error(`${id} must have exactly four choices.`);
  const choiceIds = new Set(choices.map((choice) => choice.id));
  const visibleChoices = new Set(choices.map((choice) => choice.text.trim().toLocaleLowerCase()));
  if (choiceIds.size !== 4) throw new Error(`${id} has duplicate choice IDs.`);
  if (visibleChoices.size !== 4) throw new Error(`${id} has duplicate visible choices.`);
  if (!choiceIds.has(correctChoiceId)) throw new Error(`${id} has an invalid correct choice.`);
}

function shuffle<T>(items: readonly T[], rng: RandomSource) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, rng);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function randomIndex(length: number, rng: RandomSource) {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error("Random source must return a finite value from 0 up to, but not including, 1.");
  }
  return Math.floor(value * length);
}
