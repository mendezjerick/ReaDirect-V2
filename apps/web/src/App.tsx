import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import {
  GameLobbyPage,
  GameLobbySkeletonProvider,
  RequireSkeletonGameProfile,
} from "@readirect/game-lobby";

import { RouteTransitionProvider } from "./components/transitions/RouteTransitionProvider";
import { HomePage } from "./features/home/HomePage";
import { IntroPage } from "./features/intro/IntroPage";

const LearnerDashboardPage = lazy(() =>
  import("./features/learner-dashboard/LearnerDashboardPage").then(
    (module) => ({ default: module.LearnerDashboardPage }),
  ),
);

const GameOneRoutePage = lazy(() =>
  import("@readirect/game-one").then((module) => ({
    default: module.GameOneRoutePage,
  })),
);

const GameTwoRoutePage = lazy(() =>
  import("@readirect/game-two").then((module) => ({
    default: module.GameTwoRoutePage,
  })),
);

function RouteLoading() {
  return (
    <main className="route-loading" aria-live="polite" aria-busy="true">
      <span>Opening ReaDirect…</span>
    </main>
  );
}

export function App() {
  return (
    <RouteTransitionProvider>
      <GameLobbySkeletonProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<IntroPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route
              path="/learner/dashboard"
              element={<LearnerDashboardPage />}
            />
            <Route path="/learner/games" element={<GameLobbyPage />} />
            <Route
              path="/learner/games/game-one"
              element={
                <RequireSkeletonGameProfile>
                  <GameOneRoutePage />
                </RequireSkeletonGameProfile>
              }
            />
            <Route
              path="/learner/games/game-two"
              element={
                <RequireSkeletonGameProfile>
                  <GameTwoRoutePage />
                </RequireSkeletonGameProfile>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </GameLobbySkeletonProvider>
    </RouteTransitionProvider>
  );
}
