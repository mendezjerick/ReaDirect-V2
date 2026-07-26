import { useEffect, useMemo, useReducer } from "react";
import type { GameLanguage } from "../localization/language";
import {
  chooseFishingResult,
  createFishingSession,
  fishingReducer,
  type FishingResultId,
  type FishingSpot
} from "./fishingSystem";

type FishingOverlayProps = {
  language: GameLanguage;
  spot: FishingSpot;
  caughtResultIds: readonly FishingResultId[];
  onCancel: () => void;
  onComplete: (resultId: FishingResultId, attempts: number) => void;
  random?: () => number;
};

const COPY = {
  en: {
    eyebrow: "Fishing + Reading Challenge",
    title: "Catch a Reading Clue",
    instructions: "Cast into the river and watch the bobber. Every catch unlocks a short clue to read and answer.",
    cast: "Cast Line",
    waiting: "Watch the bobber...",
    bite: "The bobber splashed!",
    pull: "Pull",
    caught: "You found",
    read: "Read the Catch Clue",
    question: "Read the catch clue, then answer one comprehension question.",
    tryAgain: "Look at the clue and try once more.",
    correct: "Correct! You understood the clue.",
    finish: "Finish Reading Catch",
    progress: "Fishing reading progress",
    castStep: "Cast",
    readStep: "Read",
    answerStep: "Answer",
    cancel: "Stop Fishing"
  },
  fil: {
    eyebrow: "Hamon sa Pangingisda + Pagbasa",
    title: "Manghuli ng Pahiwatig",
    instructions: "Ihagis ang pamingwit at bantayan ang palutang. Bawat huli ay may maikling pahiwatig na babasahin at sasagutin.",
    cast: "Ihagis ang Pamingwit",
    waiting: "Bantayan ang palutang...",
    bite: "Tumilamsik ang palutang!",
    pull: "Hilahin",
    caught: "Nakuha mo ang",
    read: "Basahin ang Pahiwatig sa Huli",
    question: "Basahin ang pahiwatig sa huli, saka sagutin ang isang tanong sa pag-unawa.",
    tryAgain: "Basahin muli ang pahiwatig at subukan ulit.",
    correct: "Tama! Naunawaan mo ang pahiwatig.",
    finish: "Tapusin ang Babasahing Huli",
    progress: "Progreso sa pangingisda at pagbasa",
    castStep: "Ihagis",
    readStep: "Basahin",
    answerStep: "Sagutin",
    cancel: "Itigil ang Pangingisda"
  }
} as const;

const RESULT_CONTENT = {
  "message-bottle": {
    en: {
      name: "message bottle",
      story: "Lina placed a note inside the bottle before it floated downstream.",
      question: "What did Lina put inside the bottle?",
      choices: [{ id: "note", label: "A note" }, { id: "water", label: "River water" }, { id: "stone", label: "A stone" }],
      correctChoiceId: "note"
    },
    fil: {
      name: "boteng may mensahe",
      story: "Naglagay si Lina ng tala sa loob ng bote bago ito inanod sa ilog.",
      question: "Ano ang inilagay ni Lina sa loob ng bote?",
      choices: [{ id: "note", label: "Isang tala" }, { id: "water", label: "Tubig-ilog" }, { id: "stone", label: "Isang bato" }],
      correctChoiceId: "note"
    }
  },
  "silver-fish": {
    en: {
      name: "silver fish",
      story: "The small silver fish rested in the shallow water near the reeds.",
      question: "Where did the silver fish rest?",
      choices: [{ id: "shallow", label: "Near the reeds" }, { id: "tree", label: "Under a tree" }, { id: "market", label: "At the market" }],
      correctChoiceId: "shallow"
    },
    fil: {
      name: "pilak na isda",
      story: "Nagpahinga ang maliit na pilak na isda sa mababaw na tubig malapit sa mga tambo.",
      question: "Saan nagpahinga ang pilak na isda?",
      choices: [{ id: "shallow", label: "Malapit sa mga tambo" }, { id: "tree", label: "Sa ilalim ng puno" }, { id: "market", label: "Sa palengke" }],
      correctChoiceId: "shallow"
    }
  }
} as const;

export function FishingOverlay({
  language,
  spot,
  caughtResultIds,
  onCancel,
  onComplete,
  random = Math.random
}: FishingOverlayProps) {
  const [state, dispatch] = useReducer(fishingReducer, undefined, createFishingSession);
  const copy = COPY[language];
  const resultId = useMemo(() => chooseFishingResult(caughtResultIds, random), [caughtResultIds, random]);
  const result = RESULT_CONTENT[resultId][language];

  useEffect(() => {
    if (state.stage !== "waiting") return;
    const timer = window.setTimeout(() => dispatch({ type: "BITE" }), 1400 + Math.floor(random() * 800));
    return () => window.clearTimeout(timer);
  }, [random, state.stage]);

  return (
    <div className="fishing-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="fishing-title" className="fishing-panel">
        <header className="fishing-header">
          <div>
            <p>{copy.eyebrow}</p>
            <h2 id="fishing-title">{copy.title}</h2>
            <span>{spot.labels[language]}</span>
          </div>
          <button type="button" onClick={onCancel} aria-label={language === "fil" ? "Isara" : "Close"}>X</button>
        </header>

        <ol className="fishing-reading-progress" aria-label={copy.progress}>
          <FishingProgressStep
            active={["instructions", "waiting", "bite"].includes(state.stage)}
            complete={["story", "question", "feedback", "complete"].includes(state.stage)}
            index="1"
            label={copy.castStep}
          />
          <FishingProgressStep
            active={state.stage === "story"}
            complete={["question", "feedback", "complete"].includes(state.stage)}
            index="2"
            label={copy.readStep}
          />
          <FishingProgressStep
            active={["question", "feedback"].includes(state.stage)}
            complete={state.stage === "complete"}
            index="3"
            label={copy.answerStep}
          />
        </ol>

        <div className={`fishing-scene fishing-stage-${state.stage}`} aria-hidden="true">
          <span className="fishing-bank" />
          <span className="fishing-water" />
          <span className="fishing-line" />
          <span className="fishing-bobber" />
          {state.stage === "bite" && <span className="fishing-splash">+</span>}
        </div>

        <div className="fishing-copy" aria-live="polite">
          {state.stage === "instructions" && <p>{copy.instructions}</p>}
          {state.stage === "waiting" && <p>{copy.waiting}</p>}
          {state.stage === "bite" && <p className="fishing-cue">{copy.bite}</p>}
          {state.stage === "story" && <><p className="fishing-catch">{copy.caught} <strong>{result.name}</strong>.</p><blockquote>{result.story}</blockquote></>}
          {state.stage === "question" && <><p>{copy.question}</p><blockquote>{result.story}</blockquote><h3>{result.question}</h3></>}
          {state.stage === "feedback" && <p className={state.answerCorrect ? "is-correct" : "is-retry"}>{state.answerCorrect ? copy.correct : copy.tryAgain}</p>}
        </div>

        {state.stage === "instructions" && <button type="button" className="fishing-primary" onClick={() => dispatch({ type: "CAST" })}>{copy.cast}</button>}
        {state.stage === "bite" && <button type="button" className="fishing-primary fishing-pull" onClick={() => dispatch({ type: "PULL", resultId })}>{copy.pull}</button>}
        {state.stage === "story" && <button type="button" className="fishing-primary" onClick={() => dispatch({ type: "READ_STORY" })}>{copy.read}</button>}
        {state.stage === "question" && (
          <div className="fishing-choices">
            {result.choices.map((choice) => (
              <button key={choice.id} type="button" onClick={() => dispatch({ type: "ANSWER", choiceId: choice.id, correctChoiceId: result.correctChoiceId })}>{choice.label}</button>
            ))}
          </div>
        )}
        {state.stage === "feedback" && state.answerCorrect === false && <button type="button" className="fishing-primary" onClick={() => dispatch({ type: "TRY_AGAIN" })}>{language === "fil" ? "Subukan Muli" : "Try Again"}</button>}
        {state.stage === "feedback" && state.answerCorrect === true && (
          <button type="button" className="fishing-primary" onClick={() => {
            dispatch({ type: "FINISH" });
            onComplete(resultId, state.attempts);
          }}>{copy.finish}</button>
        )}

        <button type="button" className="fishing-cancel" onClick={onCancel}>{copy.cancel}</button>
      </section>
    </div>
  );
}

function FishingProgressStep({
  active,
  complete,
  index,
  label
}: {
  active: boolean;
  complete: boolean;
  index: string;
  label: string;
}) {
  return (
    <li className={`${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}>
      <span aria-hidden="true">{complete ? "\u2713" : index}</span>
      <strong>{label}</strong>
    </li>
  );
}
