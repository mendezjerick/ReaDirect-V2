import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  GameProfileRequestError,
  isSafeRequestedGameRoute,
  useGameLobbySkeleton,
} from "./GameLobbySkeletonContext";
import { registeredGames, type RegisteredGame } from "./registry";
import "./styles/lobby.css";

interface LobbyLocationState {
  requestedGame?: string;
}

type GameSlot = RegisteredGame;
type GameKey = GameSlot["key"];

export interface GameLobbyPageProps {
  /**
   * Portal learners can explore the games without a persistent game profile.
   * Preview mode deliberately keeps all progress in the current page session.
   */
  previewMode?: boolean;
}

const gameSlots = registeredGames;

function GameSymbol({ gameKey }: { gameKey: GameKey }) {
  return gameKey === "game-alpha" ? (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 17h24v6h6v18h-6v6H20v-6h-6V23h6v-6Z" />
      <path d="M24 27h6v6h-6zM34 27h6v6h-6zM26 39h12M29 11h6v6" />
    </svg>
  ) : gameKey === "chronicles-of-the-lost-kingdom" ? (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M13 48V16h18c8 0 14 5 14 13s-6 13-14 13H22" />
      <path d="M22 24h9c3 0 5 2 5 5s-2 5-5 5h-9M49 14v10M44 19h10" />
    </svg>
  ) : (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 18h44v32H10V18Z" />
      <path d="M19 28h8v8h-8zM31 28h14M19 41h26" />
      <path d="m48 10 6 8-6 8" />
    </svg>
  );
}

export function GameLobbyPage({ previewMode = false }: GameLobbyPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile,
    status,
    error: profileError,
    loadProfile,
    createProfile,
    retry,
  } = useGameLobbySkeleton();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [launchingGameKey, setLaunchingGameKey] = useState<GameKey | null>(
    null,
  );
  const [, startRouteTransition] = useTransition();

  const requestedGame = (location.state as LobbyLocationState | null)
    ?.requestedGame;
  const launchingGame = gameSlots.find((game) => game.key === launchingGameKey);

  useEffect(() => {
    if (!previewMode && status === "idle") {
      void loadProfile();
    }
  }, [loadProfile, previewMode, status]);

  if (!previewMode && (status === "idle" || status === "loading")) {
    return <ProfileLoadingState />;
  }

  if (!previewMode && profileError) {
    if (
      profileError instanceof GameProfileRequestError &&
      profileError.status === 401
    ) {
      return (
        <ProfileErrorState
          message="Your learner session expired. Sign in again to open Games."
          actionLabel="Go to Learner Login"
          onAction={() => navigate("/learner/login")}
        />
      );
    }

    return (
      <ProfileErrorState
        message={
          status === "error" &&
          profileError instanceof GameProfileRequestError &&
          profileError.status === 422
            ? profileError.message
            : "We couldn't load your game profile right now."
        }
        actionLabel="Retry"
        onAction={retry}
      />
    );
  }

  const submitUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = username.trim();

    if (!/^[A-Za-z0-9]{3,10}$/.test(normalized)) {
      setError("Use 3 to 10 letters and numbers only.");
      return;
    }

    setError("");
    void createProfile(normalized).then((createdProfile) => {
      if (!createdProfile) return;

      if (isSafeRequestedGameRoute(requestedGame)) {
        navigate(requestedGame, { replace: true, state: undefined });
      }
    });
  };

  const showGames = previewMode || Boolean(profile);

  return (
    <main
      className="game-lobby learner-flow-page"
      aria-label="Game Lobby"
      data-route-focus
      tabIndex={-1}
    >
      <div className="game-lobby__shell">
        <header className="game-lobby__header">
          <div>
            <p className="game-lobby__eyebrow">ReaDirect Games</p>
            <h1>Choose a Game</h1>
            <p>Play, practice, and have fun.</p>
          </div>
          <button
            className="game-lobby__back-button"
            type="button"
            aria-label="Back to Dashboard"
            disabled={Boolean(launchingGame)}
            onClick={() => navigate("/learner/dashboard")}
          >
            <span aria-hidden="true">←</span> Dashboard
          </button>
        </header>

        {!showGames ? (
          <section
            className="game-lobby__username-card"
            aria-labelledby="game-username-title"
          >
            <span className="game-lobby__profile-mark" aria-hidden="true">
              Aa
            </span>
            <div>
              <p className="game-lobby__eyebrow">One quick step</p>
              <h2 id="game-username-title">Pick a game name</h2>
              <p>Choose a short name to use while you play.</p>
            </div>

            <form
              onSubmit={submitUsername}
              noValidate
              aria-busy={status === "creating"}
            >
              <label htmlFor="game-username">Game username</label>
              <input
                id="game-username"
                name="game-username"
                value={username}
                minLength={3}
                maxLength={10}
                autoComplete="off"
                aria-describedby="game-username-help game-username-error"
                onChange={(event) => setUsername(event.target.value)}
              />
              <span id="game-username-help">
                Use 3 to 10 letters and numbers.
              </span>
              <span
                id="game-username-error"
                className="game-lobby__error"
                aria-live="polite"
              >
                {error}
              </span>
              <button
                className="game-lobby__primary-button"
                type="submit"
                disabled={status === "creating"}
              >
                {status === "creating" ? "Creating..." : "Enter the Lobby"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section
              className="game-lobby__profile"
              aria-label={
                previewMode ? "Game preview mode" : "Current game profile"
              }
            >
              <span>{previewMode ? "Preview mode" : "Your game username"}</span>
              <strong>
                {previewMode ? "Progress is not saved" : profile?.publicHandle}
              </strong>
            </section>

            <section
              className="game-lobby__games"
              aria-labelledby="available-games-title"
            >
              <div className="game-lobby__section-heading">
                <div>
                  <p className="game-lobby__eyebrow">Pick your challenge</p>
                  <h2 id="available-games-title">Ready to play?</h2>
                </div>
                <span>{gameSlots.length} games</span>
              </div>

              <div className="game-lobby__game-grid">
                {gameSlots.map((game) => (
                  <article className="game-lobby__game-card" key={game.key}>
                    <div className="game-lobby__game-visual">
                      {game.thumbnail ? (
                        <img
                          className="game-lobby__game-thumbnail"
                          src={game.thumbnail}
                          alt={`${game.title} preview`}
                          decoding="async"
                        />
                      ) : (
                        <span className="game-lobby__game-symbol">
                          <GameSymbol gameKey={game.key} />
                        </span>
                      )}
                      <span className="game-lobby__game-label">
                        {game.label}
                      </span>
                    </div>
                    <div className="game-lobby__game-copy">
                      <h3>{game.title}</h3>
                      <p>{game.description}</p>
                    </div>
                    <button
                      className="game-lobby__game-button"
                      type="button"
                      aria-label={game.accessibleName}
                      aria-busy={launchingGameKey === game.key || undefined}
                      disabled={Boolean(launchingGame)}
                      onClick={() => {
                        if (launchingGameKey) return;
                        setLaunchingGameKey(game.key);
                        startRouteTransition(() => navigate(game.route));
                      }}
                    >
                      {launchingGameKey === game.key
                        ? "Loading..."
                        : "Play now"}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="game-lobby__leaderboard"
              aria-labelledby="learner-leaderboard-title"
            >
              <div>
                <p className="game-lobby__eyebrow">Coming soon</p>
                <h2 id="learner-leaderboard-title">Top Readers</h2>
              </div>
              <p>Your best game scores will appear here.</p>
            </section>
          </>
        )}
      </div>

      {launchingGame ? (
        <div
          className="clara-speech-loader game-lobby__launch-loader"
          role="status"
          aria-live="polite"
          aria-label={`Loading ${launchingGame.title}`}
        >
          <div className="clara-speech-loader__perspective" aria-hidden="true">
            <div className="clara-speech-loader__cube">
              <div data-cube-face="front" />
              <div data-cube-face="back" />
              <div data-cube-face="right" />
              <div data-cube-face="left" />
              <div data-cube-face="top" />
              <div data-cube-face="bottom" />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ProfileLoadingState() {
  return (
    <main
      className="game-lobby learner-flow-page"
      aria-busy="true"
      data-route-focus
      tabIndex={-1}
    >
      <div className="game-lobby__shell">
        <section
          className="game-lobby__profile-state"
          role="status"
          aria-live="polite"
        >
          Loading game profile...
        </section>
      </div>
    </main>
  );
}

function ProfileErrorState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <main
      className="game-lobby learner-flow-page"
      data-route-focus
      tabIndex={-1}
    >
      <div className="game-lobby__shell">
        <section className="game-lobby__profile-state" role="alert">
          <p>{message}</p>
          <button type="button" onClick={onAction}>
            {actionLabel}
          </button>
        </section>
      </div>
    </main>
  );
}
