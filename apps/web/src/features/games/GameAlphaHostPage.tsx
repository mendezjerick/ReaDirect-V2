import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  GameAlphaRoutePage,
  type GameAlphaHostAdapter,
} from "@readirect/game-alpha";
import { useGameLobbySkeleton } from "@readirect/game-lobby";

import { loadLearnerSession } from "../learner-auth/learnerApi";
import { createGameAlphaHostAdapter } from "./gameAlphaHostAdapter";

export function GameAlphaHostPage() {
  const location = useLocation();
  const session = loadLearnerSession();
  const { profile } = useGameLobbySkeleton();
  const token = session?.token ?? null;
  const host = useMemo<GameAlphaHostAdapter | null>(
    () => (token ? createGameAlphaHostAdapter({ token, profile }) : null),
    [profile, token],
  );
  if (!session)
    return (
      <Navigate
        to="/learner/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  if (!host) return <Navigate to="/learner/games" replace />;
  return <GameAlphaRoutePage host={host} />;
}
