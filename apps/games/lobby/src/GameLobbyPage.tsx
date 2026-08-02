import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useGameLobbySkeleton } from "./GameLobbySkeletonContext";
import "./styles/lobby.css";

interface LobbyLocationState {
  requestedGame?: string;
}

const gameSlots = [
  {
    key: "game-alpha",
    title: "Alphabet Defender",
    description: "Defend the alphabet in a fast pixel-space battle.",
    label: "Arcade",
    route: "/learner/games/game-alpha",
    accessibleName: "Open Game Alpha",
  },
  {
    key: "game-one",
    title: "Letter Quest",
    description: "Spot the letters and keep your streak going.",
    label: "Letters",
    route: "/learner/games/game-one",
    accessibleName: "Open Game One",
  },
  {
    key: "game-zero",
    title: "Game Zero",
    description: "Step into a new reading adventure.",
    label: "New",
    route: "/learner/games/game-zero",
    accessibleName: "Open Game Zero",
  },
  {
    key: "game-two",
    title: "Word Trail",
    description: "Follow the trail and practice simple words.",
    label: "Words",
    route: "/learner/games/game-two",
    accessibleName: "Open Game Two",
  },
] as const;

function GameSymbol({
  gameKey,
}: {
  gameKey: (typeof gameSlots)[number]["key"];
}) {
  return gameKey === "game-alpha" ? (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 17h24v6h6v18h-6v6H20v-6h-6V23h6v-6Z" />
      <path d="M24 27h6v6h-6zM34 27h6v6h-6zM26 39h12M29 11h6v6" />
    </svg>
  ) : gameKey === "game-zero" ? (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 9 38 23 53 25 42 36 45 51 32 44 19 51 22 36 11 25 26 23 32 9Z" />
      <path d="M25 31h14M32 24v14" />
    </svg>
  ) : gameKey === "game-one" ? (
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

export function GameLobbyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, createProfile } = useGameLobbySkeleton();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const requestedGame = (location.state as LobbyLocationState | null)
    ?.requestedGame;

  const submitUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = username.trim();

    if (!/^[A-Za-z0-9]{3,10}$/.test(normalized)) {
      setError("Use 3 to 10 letters and numbers only.");
      return;
    }

    setError("");
    createProfile(normalized);

    if (requestedGame) {
      navigate(requestedGame, { replace: true });
    }
  };

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
            onClick={() => navigate("/learner/dashboard")}
          >
            <span aria-hidden="true">←</span> Dashboard
          </button>
        </header>

        {!profile ? (
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

            <form onSubmit={submitUsername} noValidate>
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
              <button className="game-lobby__primary-button" type="submit">
                Enter the Lobby
              </button>
            </form>
          </section>
        ) : (
          <>
            <section
              className="game-lobby__profile"
              aria-label="Current game profile"
            >
              <span>Your game username</span>
              <strong>{profile.publicHandle}</strong>
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
                      <span className="game-lobby__game-symbol">
                        <GameSymbol gameKey={game.key} />
                      </span>
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
                      onClick={() => navigate(game.route)}
                    >
                      Play now
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
    </main>
  );
}
