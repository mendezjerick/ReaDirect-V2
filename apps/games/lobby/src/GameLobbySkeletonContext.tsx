import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Navigate, useLocation } from "react-router-dom";

export interface GameProfile {
  audience: "learner";
  username: string;
  discriminator: string;
  publicHandle: string;
  isActive: boolean;
}

export interface GameProfileClient {
  loadGameProfile(): Promise<GameProfile | null>;
  createGameProfile(username: string): Promise<GameProfile>;
}

export type GameProfileStatus =
  "idle" | "loading" | "ready" | "creating" | "error";

export class GameProfileRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GameProfileRequestError";
    this.status = status;
  }
}

interface GameLobbyProfileContextValue {
  profile: GameProfile | null;
  status: GameProfileStatus;
  error: Error | null;
  loadProfile(): Promise<GameProfile | null>;
  createProfile(username: string): Promise<GameProfile | null>;
  retry(): void;
}

interface GameLobbyProfileProviderProps extends PropsWithChildren {
  profileClient: GameProfileClient;
  sessionChangeEvent?: string;
}

const GameLobbyProfileContext =
  createContext<GameLobbyProfileContextValue | null>(null);

export function GameLobbySkeletonProvider({
  children,
  profileClient,
  sessionChangeEvent = "readirect:learner-session-changed",
}: GameLobbyProfileProviderProps) {
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [status, setStatus] = useState<GameProfileStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const pendingLoad = useRef<Promise<GameProfile | null> | null>(null);
  const sessionGeneration = useRef(0);

  const loadProfile = useCallback(() => {
    if (pendingLoad.current) return pendingLoad.current;

    const generation = sessionGeneration.current;
    setStatus("loading");
    setError(null);
    const request = profileClient
      .loadGameProfile()
      .then((nextProfile) => {
        if (generation !== sessionGeneration.current) return null;
        setProfile(nextProfile);
        setStatus("ready");
        return nextProfile;
      })
      .catch((requestError: unknown) => {
        if (generation !== sessionGeneration.current) return null;
        const normalizedError =
          requestError instanceof Error
            ? requestError
            : new Error("We couldn't load your game profile right now.");
        setProfile(null);
        setStatus("error");
        setError(normalizedError);
        return null;
      })
      .finally(() => {
        if (pendingLoad.current === request) pendingLoad.current = null;
      });

    pendingLoad.current = request;
    return request;
  }, [profileClient]);

  const createProfile = useCallback(
    async (username: string): Promise<GameProfile | null> => {
      setStatus("creating");
      setError(null);
      const generation = sessionGeneration.current;

      try {
        const nextProfile = await profileClient.createGameProfile(username);
        if (generation !== sessionGeneration.current) return null;
        setProfile(nextProfile);
        setStatus("ready");
        return nextProfile;
      } catch (requestError: unknown) {
        if (
          requestError instanceof GameProfileRequestError &&
          requestError.status === 409
        ) {
          try {
            const concurrentProfile = await profileClient.loadGameProfile();
            if (generation !== sessionGeneration.current) return null;
            if (concurrentProfile !== null) {
              setProfile(concurrentProfile);
              setStatus("ready");
              return concurrentProfile;
            }
          } catch {
            // Preserve the original conflict below. A failed refetch must not
            // become an implicit profile-null state.
          }
        }

        if (generation !== sessionGeneration.current) return null;

        const normalizedError =
          requestError instanceof Error
            ? requestError
            : new Error("We couldn't create your game profile right now.");
        setProfile(null);
        setStatus("error");
        setError(normalizedError);
        return null;
      }
    },
    [profileClient],
  );

  const resetProfile = useCallback(() => {
    sessionGeneration.current += 1;
    pendingLoad.current = null;
    setProfile(null);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    window.addEventListener(sessionChangeEvent, resetProfile);
    return () => window.removeEventListener(sessionChangeEvent, resetProfile);
  }, [resetProfile, sessionChangeEvent]);

  const retry = useCallback(() => {
    void loadProfile();
  }, [loadProfile]);

  const value = useMemo<GameLobbyProfileContextValue>(
    () => ({
      profile,
      status,
      error,
      loadProfile,
      createProfile,
      retry,
    }),
    [createProfile, error, loadProfile, profile, retry, status],
  );

  return (
    <GameLobbyProfileContext.Provider value={value}>
      {children}
    </GameLobbyProfileContext.Provider>
  );
}

export function useGameLobbySkeleton() {
  const context = useContext(GameLobbyProfileContext);

  if (!context) {
    throw new Error(
      "Game lobby profile components require GameLobbySkeletonProvider.",
    );
  }

  return context;
}

const requestedGameRoutes = new Set([
  "/learner/games/game-alpha",
  "/learner/games/game-one",
  "/learner/games/game-two",
]);

export function isSafeRequestedGameRoute(
  route: string | undefined,
): route is
  | "/learner/games/game-alpha"
  | "/learner/games/game-one"
  | "/learner/games/game-two" {
  return route !== undefined && requestedGameRoutes.has(route);
}

export function RequireSkeletonGameProfile({
  children,
  bypass = false,
  sessionChangeEvent = "readirect:learner-session-changed",
}: PropsWithChildren<{
  bypass?: boolean | (() => boolean);
  sessionChangeEvent?: string;
}>) {
  const { profile, status, error, loadProfile, retry } = useGameLobbySkeleton();
  const location = useLocation();
  const [, refreshSessionState] = useState(0);
  const shouldBypass = typeof bypass === "function" ? bypass() : bypass;

  useEffect(() => {
    const refresh = () => refreshSessionState((current) => current + 1);
    window.addEventListener(sessionChangeEvent, refresh);
    return () => window.removeEventListener(sessionChangeEvent, refresh);
  }, [refreshSessionState, sessionChangeEvent]);

  useEffect(() => {
    if (!shouldBypass && status === "idle") void loadProfile();
  }, [loadProfile, shouldBypass, status]);

  if (shouldBypass) return children;

  if (status === "idle" || status === "loading" || status === "creating") {
    return <GameProfileLoadingState />;
  }

  if (error) {
    if (error instanceof GameProfileRequestError && error.status === 401) {
      return (
        <Navigate
          to="/learner/login"
          replace
          state={{ from: location.pathname }}
        />
      );
    }

    return <GameProfileErrorState retry={retry} />;
  }

  if (!profile) {
    const requestedGame = isSafeRequestedGameRoute(location.pathname)
      ? location.pathname
      : undefined;

    return (
      <Navigate
        to="/learner/games"
        replace
        state={requestedGame ? { requestedGame } : undefined}
      />
    );
  }

  return children;
}

function GameProfileLoadingState() {
  return (
    <main className="game-lobby learner-flow-page" aria-busy="true">
      <section
        className="game-lobby__profile-state"
        role="status"
        aria-live="polite"
      >
        Loading game profile...
      </section>
    </main>
  );
}

function GameProfileErrorState({ retry }: { retry: () => void }) {
  return (
    <main className="game-lobby learner-flow-page">
      <section className="game-lobby__profile-state" role="alert">
        <p>We couldn't load your game profile right now.</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </section>
    </main>
  );
}
