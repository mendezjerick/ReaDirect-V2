import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { GameTwoRoutePage, type GameTwoHostAdapter } from "@readirect/game-two";
import { useGameLobbySkeleton } from "@readirect/game-lobby";

import { loadLearnerSession } from "../learner-auth/learnerApi";
import { createGameTwoHostAdapter } from "./gameTwoHostAdapter";

export function GameTwoHostPage() {
  const location = useLocation();
  const session = loadLearnerSession();
  const { profile } = useGameLobbySkeleton();
  const token = session?.token ?? null;
  const previewMode = session?.learner.account_purpose === "portal_system";
  const host = useMemo<GameTwoHostAdapter | null>(
    () =>
      previewMode
        ? null
        : token
          ? createGameTwoHostAdapter({ token, profile })
          : null,
    [previewMode, profile, token],
  );

  if (!session) {
    return (
      <Navigate
        to="/learner/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  if (previewMode) return <GameTwoRoutePage />;
  if (!host) return <Navigate to="/learner/games" replace />;
  return <GameTwoRoutePage host={host} />;
}
