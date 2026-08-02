import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { GameAlphaCanvas } from "./components/GameAlphaCanvas";
import { GameAudio } from "./game/audio/GameAudio";
import "./styles/game-alpha.css";

type Screen = "menu" | "play" | "instructions";

export function GameAlphaRoutePage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("menu");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const menuAudioRef = useRef<GameAudio | null>(null);

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
            <p className="game-alpha__eyebrow">Game Alpha</p>
            <h1>Alphabet Defender</h1>
            <p className="game-alpha__summary">
              Break the hostile formation, rescue captured fighters, and protect
              the one alphabet ally hidden in every wave.
            </p>
            <div className="game-alpha__actions">
              <button type="button" onClick={() => openScreen("play")}>
                Play
              </button>
              <button
                className="game-alpha__secondary"
                type="button"
                onClick={() => openScreen("instructions")}
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
            <button type="button" onClick={() => openScreen("menu")}>
              Back to Menu
            </button>
          </div>
        )}

        {screen === "play" && (
          <GameAlphaCanvas
            soundEnabled={soundEnabled}
            onSoundEnabledChange={setSoundEnabled}
            onExit={() => openScreen("menu")}
          />
        )}
      </section>
    </main>
  );
}
