import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OttertaleGame, type OttertaleStageCompletion } from "./OttertaleGame";
import {
  createInitialGameTwoProgress,
  gameTwoStatesEqual,
  hydrateGameTwoSave,
  mergeGameTwoCompletion,
  type GameTwoSaveState,
  type HydratedGameTwoProgress,
} from "./game/persistence/gameTwoSaveContract";
import { persistGameTwoCompletion } from "./game/persistence/gameTwoSaveCoordinator";
import type { GameTwoHostAdapter } from "./host/GameTwoHostAdapter";
import "./styles/game-two.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; progress: HydratedGameTwoProgress }
  | { status: "error"; message: string };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type RecoveryAction = "save" | "reset" | null;

const previewHost: GameTwoHostAdapter = {
  profile: null,
  async load() {
    return null;
  },
  async save(request) {
    return {
      checkpointKey: request.checkpointKey,
      saveSchemaVersion: request.saveSchemaVersion,
      state: request.state,
      revision: request.expectedRevision + 1,
      savedAt: new Date().toISOString(),
    };
  },
  async newGame() {},
};

export function GameTwoRoutePage({
  host = previewHost,
}: {
  host?: GameTwoHostAdapter;
}) {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [recoveryAction, setRecoveryAction] = useState<RecoveryAction>(null);
  const [retryKey, setRetryKey] = useState(0);
  const loadPromiseRef = useRef<Promise<
    Awaited<ReturnType<GameTwoHostAdapter["load"]>>
  > | null>(null);
  const loadHostRef = useRef<GameTwoHostAdapter>(host);
  const loadRetryRef = useRef(-1);
  const confirmedProgressRef = useRef<HydratedGameTwoProgress>(
    createInitialGameTwoProgress(),
  );
  const visibleStateRef = useRef<GameTwoSaveState>(
    createInitialGameTwoProgress().state,
  );
  const pendingCompletionRef = useRef<OttertaleStageCompletion | null>(null);

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    if (loadHostRef.current !== host || loadRetryRef.current !== retryKey) {
      loadPromiseRef.current = null;
      loadHostRef.current = host;
      loadRetryRef.current = retryKey;
    }
    const loadPromise = loadPromiseRef.current ?? host.load();
    loadPromiseRef.current = loadPromise;
    void loadPromise
      .then((save) => {
        const hydrated = hydrateGameTwoSave(save);
        if (!active) return;
        confirmedProgressRef.current = hydrated;
        visibleStateRef.current = hydrated.state;
        pendingCompletionRef.current = null;
        setLoadState({ status: "ready", progress: hydrated });
      })
      .catch(() => {
        if (active) {
          setLoadState({
            status: "error",
            message: "We couldn't load your OtterTale progress.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [host, retryKey]);

  const saveCompletion = (completion: OttertaleStageCompletion) => {
    const confirmed = confirmedProgressRef.current;
    pendingCompletionRef.current = completion;
    setSaveStatus("saving");
    setRecoveryAction("save");
    void persistGameTwoCompletion(host, confirmed, completion)
      .then((saved) => {
        confirmedProgressRef.current = saved;
        visibleStateRef.current = saved.state;
        pendingCompletionRef.current = null;
        setLoadState({ status: "ready", progress: saved });
        setSaveStatus("saved");
        setRecoveryAction(null);
      })
      .catch(() => {
        // The just-completed result remains in visibleStateRef and is shown
        // with a truthful retry state; it is never reported as Saved.
        setSaveStatus("error");
      });
  };

  const handleStageComplete = (completion: OttertaleStageCompletion) => {
    if (loadState.status !== "ready") return;
    const visibleState = mergeGameTwoCompletion(
      visibleStateRef.current,
      completion,
    );
    visibleStateRef.current = visibleState;
    setLoadState({
      status: "ready",
      progress: {
        ...confirmedProgressRef.current,
        state: visibleState,
      },
    });
    if (gameTwoStatesEqual(confirmedProgressRef.current.state, visibleState)) {
      return;
    }
    saveCompletion(completion);
  };

  const applyReset = () => {
    setSaveStatus("saving");
    setRecoveryAction("reset");
    void host
      .newGame(confirmedProgressRef.current.revision)
      .then(() => {
        const empty = createInitialGameTwoProgress();
        confirmedProgressRef.current = empty;
        visibleStateRef.current = empty.state;
        pendingCompletionRef.current = null;
        setLoadState({ status: "ready", progress: empty });
        setSaveStatus("saved");
        setRecoveryAction(null);
      })
      .catch(() => setSaveStatus("error"));
  };

  const retryRecovery = () => {
    if (recoveryAction === "save" && pendingCompletionRef.current) {
      saveCompletion(pendingCompletionRef.current);
    } else if (recoveryAction === "reset") {
      applyReset();
    }
  };

  const resetProgress = () => {
    if (loadState.status !== "ready") return;
    if (
      window.confirm(
        "Reset OtterTale progress? Your completed stages and best scores will be cleared. Your game name and other games will not be affected.",
      )
    ) {
      applyReset();
    }
  };

  const backToLobby = () => navigate("/learner/games");

  if (loadState.status === "loading") {
    return (
      <main className="game-two learner-flow-page" aria-label="OtterTale">
        <section className="game-two__stage">
          <div className="game-two__panel" role="status">
            <p>Loading your OtterTale progress…</p>
          </div>
        </section>
      </main>
    );
  }

  if (loadState.status === "error") {
    return (
      <main className="game-two learner-flow-page" aria-label="OtterTale">
        <section className="game-two__stage">
          <div className="game-two__panel" role="alert">
            <p>{loadState.message}</p>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Retry
            </button>
            <button
              className="game-two__text-button"
              type="button"
              onClick={backToLobby}
            >
              Back to game lobby
            </button>
          </div>
        </section>
      </main>
    );
  }

  const visibleProgress = {
    completedStageIds: visibleStateRef.current.completedStageIds,
    bestScoresByStage: visibleStateRef.current.bestScoresByStage,
  };

  return (
    <main
      className="game-two learner-flow-page"
      aria-label="OtterTale Game Two"
      data-route-focus
      tabIndex={-1}
    >
      <button
        className="game-two__lobby-link"
        type="button"
        onClick={backToLobby}
      >
        Back to game lobby
      </button>
      {saveStatus === "error" && (
        <div className="game-two__save-warning" role="alert">
          <span>
            {recoveryAction === "reset"
              ? "OtterTale reset could not be completed."
              : "Stage complete locally, but OtterTale progress could not be saved."}
          </span>
          <button type="button" onClick={retryRecovery}>
            {recoveryAction === "reset" ? "Retry reset" : "Retry save"}
          </button>
        </div>
      )}
      {saveStatus === "saving" && (
        <div className="game-two__save-status" role="status">
          Saving OtterTale progress…
        </div>
      )}
      {saveStatus === "saved" && (
        <div className="game-two__save-status" role="status">
          OtterTale progress saved.
        </div>
      )}
      <OttertaleGame
        progress={visibleProgress}
        onStageComplete={handleStageComplete}
        onExitToLobby={backToLobby}
        onResetProgress={resetProgress}
      />
      <button
        className="game-two__reset-link"
        type="button"
        onClick={resetProgress}
      >
        Reset OtterTale progress
      </button>
    </main>
  );
}
