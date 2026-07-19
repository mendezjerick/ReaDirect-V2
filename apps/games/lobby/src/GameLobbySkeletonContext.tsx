import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Navigate, useLocation } from "react-router-dom";

interface SkeletonGameProfile {
  username: string;
  discriminator: string;
  publicHandle: string;
}

interface GameLobbySkeletonContextValue {
  profile: SkeletonGameProfile | null;
  createProfile(username: string): SkeletonGameProfile;
}

const GameLobbySkeletonContext =
  createContext<GameLobbySkeletonContextValue | null>(null);

function createDiscriminator() {
  return String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
}

export function GameLobbySkeletonProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<SkeletonGameProfile | null>(null);

  const value = useMemo<GameLobbySkeletonContextValue>(
    () => ({
      profile,
      createProfile(username) {
        const discriminator = createDiscriminator();
        const nextProfile = {
          username,
          discriminator,
          publicHandle: username + "#" + discriminator,
        };

        setProfile(nextProfile);
        return nextProfile;
      },
    }),
    [profile],
  );

  return (
    <GameLobbySkeletonContext.Provider value={value}>
      {children}
    </GameLobbySkeletonContext.Provider>
  );
}

export function useGameLobbySkeleton() {
  const context = useContext(GameLobbySkeletonContext);

  if (!context) {
    throw new Error(
      "Game lobby skeleton components require GameLobbySkeletonProvider.",
    );
  }

  return context;
}

export function RequireSkeletonGameProfile({ children }: PropsWithChildren) {
  const { profile } = useGameLobbySkeleton();
  const location = useLocation();

  if (!profile) {
    return (
      <Navigate
        to="/learner/games"
        replace
        state={{ requestedGame: location.pathname }}
      />
    );
  }

  return children;
}
