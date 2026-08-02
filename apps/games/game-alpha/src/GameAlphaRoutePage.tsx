import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./styles/game-alpha.css";

type Screen = "menu" | "play" | "instructions";

export function GameAlphaRoutePage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("menu");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const backToLobby = () => navigate("/learner/games");

  return (
    <main
      className="game-route game-alpha learner-flow-page"
      aria-label="Game Alpha"
      data-route-focus
      tabIndex={-1}
    >
      <section className="game-alpha__stage">
        {screen === "menu" && (
          <div className="game-alpha__panel">
            <p className="game-alpha__eyebrow">Game Alpha slot</p>
            <h1>Game Alpha</h1>
            <p className="game-alpha__summary">
              Replace this screen with an approved KAPLAY or PixiJS game while
              keeping the route boundary and menu contract intact.
            </p>
            <div className="game-alpha__actions">
              <button type="button" onClick={() => setScreen("play")}>
                Play Demo
              </button>
              <button
                className="game-alpha__secondary"
                type="button"
                onClick={() => setScreen("instructions")}
              >
                How to Play
              </button>
              <button
                className="game-alpha__secondary"
                type="button"
                aria-pressed={soundEnabled}
                onClick={() => setSoundEnabled((enabled) => !enabled)}
              >
                Sound: {soundEnabled ? "On" : "Off"}
              </button>
              <button
                className="game-alpha__text-button"
                type="button"
                onClick={backToLobby}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}

        {screen === "instructions" && (
          <div className="game-alpha__panel">
            <p className="game-alpha__eyebrow">Instructions</p>
            <h1>How to Play</h1>
            <p className="game-alpha__summary">
              Define the educational goal, touch and pointer controls, scoring,
              progression, and achievements in the game design specification.
            </p>
            <button type="button" onClick={() => setScreen("menu")}>
              Back to Menu
            </button>
          </div>
        )}

        {screen === "play" && (
          <div className="game-alpha__play-panel">
            <div
              className="game-alpha__canvas-host"
              aria-label="Game canvas area"
            >
              <span>Game engine mounts here</span>
            </div>
            <div className="game-alpha__play-actions">
              <button type="button" onClick={() => setScreen("menu")}>
                Back to Menu
              </button>
              <button
                className="game-alpha__secondary"
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
