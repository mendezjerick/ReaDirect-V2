import { useEffect, useRef, useState } from "react";

import {
  createGameAlphaRuntime,
  type GameAlphaRuntime,
} from "../game/pixi/createGameAlphaRuntime";

interface GameAlphaCanvasProps {
  soundEnabled: boolean;
  onSoundEnabledChange(enabled: boolean): void;
  onExit(): void;
}

export function GameAlphaCanvas({
  soundEnabled,
  onSoundEnabledChange,
  onExit,
}: GameAlphaCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GameAlphaRuntime | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const abortController = new AbortController();
    let active = true;
    let runtime: GameAlphaRuntime | null = null;

    void createGameAlphaRuntime({
      host,
      signal: abortController.signal,
      soundEnabled,
      onGameOver: () => {
        if (active) setGameOver(true);
      },
    })
      .then(async (createdRuntime) => {
        if (!active) {
          await createdRuntime.destroy();
          return;
        }
        runtime = createdRuntime;
        runtimeRef.current = createdRuntime;
        setReady(true);
      })
      .catch(() => {
        if (active)
          setError("The game renderer could not start on this device.");
      });

    return () => {
      active = false;
      abortController.abort();
      runtimeRef.current = null;
      if (runtime) void runtime.destroy();
    };
    // The runtime owns its lifecycle; sound changes are forwarded separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    runtimeRef.current?.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  const holdMove = (direction: -1 | 1) => {
    void runtimeRef.current?.resumeAudio();
    runtimeRef.current?.setMoveDirection(direction);
  };

  const releaseMove = () => runtimeRef.current?.setMoveDirection(0);
  const holdFire = () => {
    void runtimeRef.current?.resumeAudio();
    runtimeRef.current?.setFiring(true);
  };
  const releaseFire = () => runtimeRef.current?.setFiring(false);

  const togglePause = () => {
    const nextPaused = runtimeRef.current?.togglePause() ?? false;
    setPaused(nextPaused);
  };

  const restart = () => {
    runtimeRef.current?.restart();
    setGameOver(false);
    setPaused(false);
  };

  return (
    <div className="game-alpha__runtime-shell">
      <div className="game-alpha__canvas-frame">
        <div ref={hostRef} className="game-alpha__canvas-host" />
        {!ready && !error && (
          <div className="game-alpha__loading" role="status">
            Preparing formation…
          </div>
        )}
        {error && (
          <div
            className="game-alpha__loading game-alpha__loading--error"
            role="alert"
          >
            <p>{error}</p>
            <button type="button" onClick={onExit}>
              Return to Menu
            </button>
          </div>
        )}

        {ready && !error && (
          <div
            className="game-alpha__touch-controls"
            aria-label="Game controls"
          >
            <button
              type="button"
              aria-label="Move left"
              onPointerDown={() => holdMove(-1)}
              onPointerUp={releaseMove}
              onPointerCancel={releaseMove}
              onPointerLeave={releaseMove}
            >
              ◀
            </button>
            <button
              className="game-alpha__fire-control"
              type="button"
              aria-label="Fire"
              onPointerDown={holdFire}
              onPointerUp={releaseFire}
              onPointerCancel={releaseFire}
              onPointerLeave={releaseFire}
            >
              FIRE
            </button>
            <button
              type="button"
              aria-label="Move right"
              onPointerDown={() => holdMove(1)}
              onPointerUp={releaseMove}
              onPointerCancel={releaseMove}
              onPointerLeave={releaseMove}
            >
              ▶
            </button>
          </div>
        )}
      </div>

      <div className="game-alpha__runtime-actions">
        {gameOver ? (
          <button type="button" onClick={restart}>
            Play Again
          </button>
        ) : (
          <button
            type="button"
            onClick={togglePause}
            disabled={!ready || Boolean(error)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          className="game-alpha__secondary"
          type="button"
          aria-pressed={soundEnabled}
          onClick={() => onSoundEnabledChange(!soundEnabled)}
        >
          Sound: {soundEnabled ? "On" : "Off"}
        </button>
        <button
          className="game-alpha__text-button"
          type="button"
          onClick={onExit}
        >
          Exit to Menu
        </button>
      </div>
    </div>
  );
}
