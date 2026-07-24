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

const LessonIntroPage = lazy(() =>
  import("./features/lesson-intro/LessonIntroPage").then((module) => ({
    default: module.LessonIntroPage,
  })),
);

const LearnWithClaraLessonOnePage = lazy(() =>
  import("./features/learn-with-clara/LearnWithClaraLessonOnePage").then(
    (module) => ({
      default: module.LearnWithClaraLessonOnePage,
    }),
  ),
);

const AssessmentPartOnePage = lazy(() =>
  import("./features/assessment/AssessmentPartOnePage").then((module) => ({
    default: module.AssessmentPartOnePage,
  })),
);

const AssessmentPartTwoPage = lazy(() =>
  import("./features/assessment/AssessmentPartTwoPage").then((module) => ({
    default: module.AssessmentPartTwoPage,
  })),
);

const LessonOnePage = lazy(() =>
  import("./features/lesson/LessonOnePage").then((module) => ({
    default: module.LessonOnePage,
  })),
);

const LessonTwoPage = lazy(() =>
  import("./features/lesson/LessonTwoPage").then((module) => ({
    default: module.LessonTwoPage,
  })),
);

const LessonThreePage = lazy(() =>
  import("./features/lesson/LessonThreePage").then((module) => ({
    default: module.LessonThreePage,
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

const IsoLetterSandboxPage = lazy(() =>
  import("./features/staff-dashboard/IsoLetterSandboxPage").then((module) => ({
    default: module.IsoLetterSandboxPage,
  })),
);

const TrueSandboxPage = lazy(() =>
  import("./features/staff-dashboard/TrueSandboxPage").then((module) => ({
    default: module.TrueSandboxPage,
  })),
);

const EquivalenceBookPage = lazy(() =>
  import("./features/staff-dashboard/EquivalenceBookPage").then((module) => ({
    default: module.EquivalenceBookPage,
  })),
);

const RawConfusionMatrixPage = lazy(() =>
  import("./features/staff-dashboard/RawConfusionMatrixPage").then(
    (module) => ({ default: module.RawConfusionMatrixPage }),
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
            <Route path="/learner/lesson-intro" element={<LessonIntroPage />} />
            <Route
              path="/learner/learn-with-clara/lesson-1"
              element={<LearnWithClaraLessonOnePage />}
            />
            <Route
              path="/learner/assessment/part-one"
              element={<AssessmentPartOnePage />}
            />
            <Route
              path="/learner/assessment/part-two"
              element={<AssessmentPartTwoPage />}
            />
            <Route
              path="/learner/assessment/complete"
              element={<AssessmentPartTwoPage />}
            />
            <Route path="/learner/lessons/1" element={<LessonOnePage />} />
            <Route path="/learner/lessons/2" element={<LessonTwoPage />} />
            <Route path="/learner/lessons/3" element={<LessonThreePage />} />
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
              path="/staff/system-admin/isoletter-sandbox"
              element={<IsoLetterSandboxPage />}
            />
            <Route
              path="/staff/system-admin/true-sandbox"
              element={<TrueSandboxPage />}
            />
            <Route
              path="/staff/system-admin/equivalence-book"
              element={<EquivalenceBookPage />}
            />
            <Route
              path="/staff/system-admin/confusion-matrix"
              element={<RawConfusionMatrixPage />}
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
