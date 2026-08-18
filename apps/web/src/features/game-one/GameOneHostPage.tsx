import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { GameOneRoutePage, type GameOneHostAdapter } from "@readirect/game-one";
import { useGameLobbySkeleton } from "@readirect/game-lobby";

import { loadLearnerSession } from "../learner-auth/learnerApi";
import { createGameOneHostAdapter } from "./gameOneHostAdapter";
import { createGameOnePreviewHostAdapter } from "./gameOnePreviewHostAdapter";

export function GameOneHostPage() {
  const location = useLocation();
  const session = loadLearnerSession();
  const { profile } = useGameLobbySkeleton();
  const token = session?.token ?? null;
  const previewMode = session?.learner.account_purpose === "portal_system";
  const host = useMemo<GameOneHostAdapter | null>(() => {
    if (previewMode) return createGameOnePreviewHostAdapter();
    if (!token) return null;
    return createGameOneHostAdapter({ token, profile });
  }, [previewMode, profile, token]);

  if (!session) {
    return (
      <Navigate
        to="/learner/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!host) {
    return <Navigate to="/learner/games" replace />;
  }

  return <GameOneRoutePage host={host} />;
}
