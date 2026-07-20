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

const LearnerLoginPage = lazy(() =>
  import("./features/learner-auth/LearnerLoginPage").then((module) => ({
    default: module.LearnerLoginPage,
  })),
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

const StaffLoginPage = lazy(() =>
  import("./features/staff-auth/StaffLoginPage").then((module) => ({
    default: module.StaffLoginPage,
  })),
);

const SystemAdminDashboardPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminDashboardPage").then(
    (module) => ({ default: module.SystemAdminDashboardPage }),
  ),
);

const SystemAdminPagePortalsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminPagePortalsPage").then(
    (module) => ({ default: module.SystemAdminPagePortalsPage }),
  ),
);

const SchoolAdministratorsPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdministratorsPage").then(
    (module) => ({ default: module.SchoolAdministratorsPage }),
  ),
);

const SchoolAdminSetupPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminSetupPage").then((module) => ({
    default: module.SchoolAdminSetupPage,
  })),
);

const SchoolAdminDashboardPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminDashboardPage").then(
    (module) => ({ default: module.SchoolAdminDashboardPage }),
  ),
);

const TeacherAccountsPage = lazy(() =>
  import("./features/staff-dashboard/TeacherAccountsPage").then((module) => ({
    default: module.TeacherAccountsPage,
  })),
);

const TeacherDashboardPage = lazy(() =>
  import("./features/staff-dashboard/TeacherDashboardPage").then((module) => ({
    default: module.TeacherDashboardPage,
  })),
);

const LearnerAccountsPage = lazy(() =>
  import("./features/staff-dashboard/LearnerAccountsPage").then((module) => ({
    default: module.LearnerAccountsPage,
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
            <Route path="/learner/login" element={<LearnerLoginPage />} />
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
            <Route path="/staff/login" element={<StaffLoginPage />} />
            <Route
              path="/staff/system-admin"
              element={<SystemAdminDashboardPage />}
            />
            <Route
              path="/staff/system-admin/school-administrators"
              element={<SchoolAdministratorsPage />}
            />
            <Route
              path="/staff/system-admin/page-portals"
              element={<SystemAdminPagePortalsPage />}
            />
            <Route
              path="/staff/school-admin/setup-school"
              element={<SchoolAdminSetupPage />}
            />
            <Route
              path="/staff/school-admin"
              element={<SchoolAdminDashboardPage />}
            />
            <Route
              path="/staff/school-admin/teachers"
              element={<TeacherAccountsPage />}
            />
            <Route path="/staff/teacher" element={<TeacherDashboardPage />} />
            <Route
              path="/staff/teacher/learners"
              element={<LearnerAccountsPage />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </GameLobbySkeletonProvider>
    </RouteTransitionProvider>
  );
}
