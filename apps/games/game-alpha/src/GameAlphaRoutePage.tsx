import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { GameSnapshot } from "./game/types";
import { GameAlphaCanvas } from "./components/GameAlphaCanvas";
import { GameAudio } from "./game/audio/GameAudio";
import {
  createInitialGameAlphaProgress,
  gameAlphaStatesEqual,
  hydrateGameAlphaSave,
  mergeGameAlphaRun,
  type HydratedGameAlphaProgress,
} from "./game/persistence/gameAlphaSaveContract";
import { persistGameAlphaRun } from "./game/persistence/gameAlphaSaveCoordinator";
import type { GameAlphaHostAdapter } from "./host/GameAlphaHostAdapter";
import "./styles/game-alpha.css";

const previewHost: GameAlphaHostAdapter = {
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

type Screen = "menu" | "play" | "instructions";
type LoadState =
  | { status: "loading" }
  | { status: "ready"; progress: HydratedGameAlphaProgress }
  | { status: "error"; message: string };
type SaveStatus = "idle" | "saving" | "saved" | "error";

export function GameAlphaRoutePage({
  host = previewHost,
}: {
  host?: GameAlphaHostAdapter;
}) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("menu");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const menuAudioRef = useRef<GameAudio | null>(null);

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    void host
      .load()
      .then((save) => {
        if (active)
          setLoadState({
            status: "ready",
            progress: hydrateGameAlphaSave(save),
          });
      })
      .catch(() => {
        if (active)
          setLoadState({
            status: "error",
            message:
              "Alphabet Defender progress could not be loaded. Try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [host, retryKey]);

  useEffect(() => {
    const menuAudio = new GameAudio();
    menuAudioRef.current = menuAudio;
    return () => {
      menuAudioRef.current = null;
      void menuAudio.destroy();
    };
  }, []);

  useEffect(() => {
    menuAudioRef.current?.setMuted(!soundEnabled);
  }, [soundEnabled]);

  const openScreen = (nextScreen: Screen) => {
    void menuAudioRef.current?.resume();
    void menuAudioRef.current?.play("menu-select");
    setScreen(nextScreen);
  };
  const backToLobby = () => {
    void menuAudioRef.current?.resume();
    void menuAudioRef.current?.play("menu-cancel");
    navigate("/learner/games");
  };
  const progress =
    loadState.status === "ready"
      ? loadState.progress
      : createInitialGameAlphaProgress();
  const profileLabel = host.profile?.publicHandle ?? "Learner";
  const saveMessage = useMemo(() => {
    if (saveStatus === "saving") return "Saving completed run…";
    if (saveStatus === "saved") return "Progress saved.";
    if (saveStatus === "error")
      return "Run complete locally, but progress could not be saved.";
    return null;
  }, [saveStatus]);

  const handleRunComplete = (snapshot: GameSnapshot) => {
    if (loadState.status !== "ready") return;
    const current = loadState.progress;
    const nextState = mergeGameAlphaRun(current.state, {
      score: snapshot.score,
      highestStageReached: snapshot.stage,
    });
    setLoadState({
      status: "ready",
      progress: { ...current, state: nextState },
    });
    if (gameAlphaStatesEqual(current.state, nextState)) return;
    setSaveStatus("saving");
    void persistGameAlphaRun(host, current, {
      score: snapshot.score,
      highestStageReached: snapshot.stage,
    })
      .then((saved) => {
        setLoadState({ status: "ready", progress: saved });
        setSaveStatus("saved");
      })
      .catch(() => setSaveStatus("error"));
  };

  const resetProgress = () => {
    if (loadState.status !== "ready") return;
    if (
      !window.confirm(
        "Reset Alphabet Defender progress? Your saved personal best will be cleared. Your game name and other games will not be affected.",
      )
    )
      return;
    setSaveStatus("saving");
    void host
      .newGame(loadState.progress.revision)
      .then(() => {
        setLoadState({
          status: "ready",
          progress: createInitialGameAlphaProgress(),
        });
        setSaveStatus("saved");
      })
      .catch(() => setSaveStatus("error"));
  };

  if (loadState.status === "loading")
    return (
      <main
        className="game-route game-alpha learner-flow-page"
        aria-label="Alphabet Defender"
      >
        <section className="game-alpha__stage">
          <div className="game-alpha__panel" role="status">
            <p>Loading your Alphabet Defender progress…</p>
          </div>
        </section>
      </main>
    );
  if (loadState.status === "error")
    return (
      <main
        className="game-route game-alpha learner-flow-page"
        aria-label="Alphabet Defender"
      >
        <section className="game-alpha__stage">
          <div className="game-alpha__panel" role="alert">
            <p>{loadState.message}</p>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Retry
            </button>
            <button
              className="game-alpha__text-button"
              type="button"
              onClick={backToLobby}
            >
              Back to Lobby
            </button>
          </div>
        </section>
      </main>
    );

  return (
    <main
      className="game-route game-alpha learner-flow-page"
      aria-label="Alphabet Defender"
      data-route-focus
      tabIndex={-1}
    >
      <section className={`game-alpha__stage game-alpha__stage--${screen}`}>
        {screen === "menu" && (
          <div className="game-alpha__panel">
            <header className="game-alpha__menu-header">
              <p className="game-alpha__eyebrow">Game Alpha · Mission 01</p>
              <span className="game-alpha__profile-pill">{profileLabel}</span>
            </header>

            <div className="game-alpha__hero">
              <div className="game-alpha__hero-mark" aria-hidden="true">
                AD
              </div>
              <div>
                <h1>Alphabet Defender</h1>
                <p className="game-alpha__summary">
                  Protect the letter ally. Break the hostile formation.
                </p>
              </div>
            </div>

            <div className="game-alpha__stats" aria-label="Mission progress">
              <div className="game-alpha__stat">
                <span>Personal best</span>
                <strong>
                  {progress.state.personalBestScore.toLocaleString()}
                </strong>
              </div>
              <div className="game-alpha__stat">
                <span>Highest stage</span>
                <strong>{progress.state.highestStageReached}</strong>
              </div>
            </div>

            {saveMessage && (
              <p
                className="game-alpha__save-status"
                role={saveStatus === "error" ? "alert" : "status"}
              >
                {saveMessage}
              </p>
            )}
            <div className="game-alpha__actions">
              <button
                className="game-alpha__primary-action"
                type="button"
                onClick={() => openScreen("play")}
              >
                <span>Start mission</span>
                <span aria-hidden="true">→</span>
              </button>
              <div className="game-alpha__utility-actions">
                <button
                  className="game-alpha__secondary"
                  type="button"
                  onClick={() => openScreen("instructions")}
                >
                  How to play
                </button>
                <button
                  className="game-alpha__secondary"
                  type="button"
                  aria-pressed={soundEnabled}
                  onClick={() => setSoundEnabled((enabled) => !enabled)}
                >
                  Sound {soundEnabled ? "on" : "off"}
                </button>
              </div>
              <div className="game-alpha__menu-footer">
                <button
                  className="game-alpha__text-button"
                  type="button"
                  onClick={resetProgress}
                >
                  Reset progress
                </button>
                <button
                  className="game-alpha__text-button"
                  type="button"
                  onClick={backToLobby}
                >
                  Back to lobby
                </button>
              </div>
            </div>
          </div>
        )}
        {screen === "instructions" && (
          <div className="game-alpha__panel">
            <p className="game-alpha__eyebrow">Instructions</p>
            <h1>How to Play</h1>
            <p className="game-alpha__summary">
              Move left and right and fire into the colored block formation. One
              letter from A to Z is your ally in every wave. Shooting it
              destroys your ship and costs one heart, so choose every shot
              carefully.
            </p>
            <ul className="game-alpha__instructions-list">
              <li>Colored and patterned blocks are hostile.</li>
              <li>
                Commander blocks need two hits and may use a tractor beam.
              </li>
              <li>
                Destroy a commander—not its captive—to form a double ship.
              </li>
              <li>Earn an extra heart every 30,000 points.</li>
            </ul>
            <p className="game-alpha__credit">
              Sound effects by SoundsbyDane.
            </p>
            <button type="button" onClick={() => openScreen("menu")}>
              Back to Menu
            </button>
          </div>
        )}
        {screen === "play" && (
          <GameAlphaCanvas
            initialHighScore={progress.state.personalBestScore}
            soundEnabled={soundEnabled}
            onSoundEnabledChange={setSoundEnabled}
            onRunComplete={handleRunComplete}
            onExit={() => openScreen("menu")}
          />
        )}
      </section>
    </main>
  );
}
