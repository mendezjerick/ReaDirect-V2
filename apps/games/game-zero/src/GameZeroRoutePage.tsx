import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./styles/game-zero.css";

type Screen = "menu" | "play" | "instructions";

export function GameZeroRoutePage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("menu");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const backToLobby = () => navigate("/learner/games");

  return (
    <main
      className="game-zero learner-flow-page"
      aria-label="Game Zero"
      data-route-focus
      tabIndex={-1}
    >
      <section className="game-zero__stage">
        {screen === "menu" && (
          <div className="game-zero__panel">
            <p className="game-zero__eyebrow">Game slot zero</p>
            <h1>Game Zero</h1>
            <p className="game-zero__summary">
              This placeholder reserves the Game Zero route and integration
              boundary while the standalone game is developed.
            </p>
            <div className="game-zero__actions">
              <button type="button" onClick={() => setScreen("play")}>
                Open Demo Area
              </button>
              <button
                className="game-zero__secondary"
                type="button"
                onClick={() => setScreen("instructions")}
              >
                How to Play
              </button>
              <button
                className="game-zero__secondary"
                type="button"
                aria-pressed={soundEnabled}
                onClick={() => setSoundEnabled((enabled) => !enabled)}
              >
                Sound: {soundEnabled ? "On" : "Off"}
              </button>
              <button
                className="game-zero__text-button"
                type="button"
                onClick={backToLobby}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}

        {screen === "instructions" && (
          <div className="game-zero__panel">
            <p className="game-zero__eyebrow">Instructions</p>
            <h1>How to Play</h1>
            <p className="game-zero__summary">
              The standalone project will define the educational goal,
              touch-first controls, scoring, and achievements.
            </p>
            <button type="button" onClick={() => setScreen("menu")}>
              Back to Menu
            </button>
          </div>
        )}

        {screen === "play" && (
          <div className="game-zero__play-panel">
            <div
              className="game-zero__canvas-host"
              aria-label="Game Zero canvas area"
            >
              <span>Game Zero mounts here</span>
            </div>
            <div className="game-zero__play-actions">
              <button type="button" onClick={() => setScreen("menu")}>
                Back to Menu
              </button>
              <button
                className="game-zero__secondary"
                type="button"
                onClick={backToLobby}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
