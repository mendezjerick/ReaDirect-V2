import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./styles/game-two.css";

type Screen = "menu" | "play" | "instructions";

export function GameTwoRoutePage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("menu");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const backToLobby = () => navigate("/learner/games");

  return (
    <main
      className="game-two"
      aria-label="Game Two"
      data-route-focus
      tabIndex={-1}
    >
      <section className="game-two__stage">
        {screen === "menu" && (
          <div className="game-two__panel">
            <p className="game-two__eyebrow">Game slot two</p>
            <h1>Game Two</h1>
            <p className="game-two__summary">
              A contributor can replace this screen with an approved KAPLAY or
              PixiJS game while keeping this route and menu contract.
            </p>
            <div className="game-two__actions">
              <button type="button" onClick={() => setScreen("play")}>
                Play Demo
              </button>
              <button
                className="game-two__secondary"
                type="button"
                onClick={() => setScreen("instructions")}
              >
                How to Play
              </button>
              <button
                className="game-two__secondary"
                type="button"
                aria-pressed={soundEnabled}
                onClick={() => setSoundEnabled((enabled) => !enabled)}
              >
                Sound: {soundEnabled ? "On" : "Off"}
              </button>
              <button
                className="game-two__text-button"
                type="button"
                onClick={backToLobby}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}

        {screen === "instructions" && (
          <div className="game-two__panel">
            <p className="game-two__eyebrow">Instructions</p>
            <h1>How to Play</h1>
            <p className="game-two__summary">
              This slot is touch-first and portrait-only. The contributor will
              define the educational goal, controls, scoring, and achievements.
            </p>
            <button type="button" onClick={() => setScreen("menu")}>
              Back to Menu
            </button>
          </div>
        )}

        {screen === "play" && (
          <div className="game-two__play-panel">
            <div
              className="game-two__canvas-host"
              aria-label="Game canvas area"
            >
              <span>Game engine mounts here</span>
            </div>
            <div className="game-two__play-actions">
              <button type="button" onClick={() => setScreen("menu")}>
                Back to Menu
              </button>
              <button
                className="game-two__secondary"
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
