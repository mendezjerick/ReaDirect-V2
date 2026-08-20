import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

import {
  GameLobbyPage,
  GameLobbySkeletonProvider,
  RequireSkeletonGameProfile,
} from "@readirect/game-lobby";

import { RouteTransitionProvider } from "./components/transitions/RouteTransitionProvider";
import { RequireStaffRole } from "./components/staff/RequireStaffRole";
import { HomePage } from "./features/home/HomePage";
import { IntroPage } from "./features/intro/IntroPage";
import { LearnerExperienceProvider } from "./features/learner-auth/LearnerExperienceProvider";
import {
  learnerSessionChangedEvent,
  loadLearnerSession,
} from "./features/learner-auth/learnerApi";
import { NativeLearnerEntryPage } from "./features/offline-practice/NativeLearnerEntryPage";
import { NativeConnectivityBanner } from "./features/connectivity/NativeConnectivityBanner";
import { learnerGameProfileClient } from "./features/games/gameProfileApi";
import {
  browserRootSurface,
  isProductionWebAppHostname,
} from "./deployment/productionDomains";

const BrowserLandingPage = lazy(() =>
  import("./features/landing/BrowserLandingPage").then((module) => ({
    default: module.BrowserLandingPage,
  })),
);

const PublicDocsPage = lazy(() =>
  import("./features/docs/PublicDocsPage").then((module) => ({
    default: module.PublicDocsPage,
  })),
);

const CreditsLicensesPage = lazy(() =>
  import("./features/legal/CreditsLicensesPage").then((module) => ({
    default: module.CreditsLicensesPage,
  })),
);

const LearnerDashboardPage = lazy(() =>
  import("./features/learner-dashboard/LearnerDashboardPage").then(
    (module) => ({ default: module.LearnerDashboardPage }),
  ),
);

const OfflinePracticeHomePage = lazy(() =>
  import("./features/offline-practice/OfflinePracticeHomePage").then(
    (module) => ({ default: module.OfflinePracticeHomePage }),
  ),
);

const OfflinePracticeModulePage = lazy(() =>
  import("./features/offline-practice/OfflinePracticeModulePage").then(
    (module) => ({ default: module.OfflinePracticeModulePage }),
  ),
);

const LearnerLoginPage = lazy(() =>
  import("./features/learner-auth/LearnerLoginPage").then((module) => ({
    default: module.LearnerLoginPage,
  })),
);

const ReadingJourneyMenuPage = lazy(() =>
  import("./features/lesson-intro/LessonIntroPage").then((module) => ({
    default: module.ReadingJourneyMenuPage,
  })),
);

const LearnWithClaraLettersPage = lazy(() =>
  import("./features/learn-with-clara/LearnWithClaraLettersPage").then(
    (module) => ({
      default: module.LearnWithClaraLettersPage,
    }),
  ),
);

const LearnWithClaraWordsPage = lazy(() =>
  import("./features/learn-with-clara/LearnWithClaraWordsPage").then(
    (module) => ({
      default: module.LearnWithClaraWordsPage,
    }),
  ),
);

const LearnWithClaraPracticePage = lazy(() =>
  import("./features/learn-with-clara/LearnWithClaraPracticePage").then(
    (module) => ({ default: module.LearnWithClaraPracticePage }),
  ),
);

const LearnWithClaraMenuPage = lazy(() =>
  import("./features/learn-with-clara/LearnWithClaraMenuPage").then(
    (module) => ({
      default: module.LearnWithClaraMenuPage,
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
const LessonFourPage = lazy(() =>
  import("./features/lesson/LessonFourPage").then((module) => ({
    default: module.LessonFourPage,
  })),
);
const LessonFivePage = lazy(() =>
  import("./features/lesson/LessonFivePage").then((module) => ({
    default: module.LessonFivePage,
  })),
);
const LessonSixPage = lazy(() =>
  import("./features/lesson/LessonSixPage").then((module) => ({
    default: module.LessonSixPage,
  })),
);

const GameOneHostPage = lazy(() =>
  import("./features/game-one/GameOneHostPage").then((module) => ({
    default: module.GameOneHostPage,
  })),
);

const GameAlphaHostPage = lazy(() =>
  import("./features/games/GameAlphaHostPage").then((module) => ({
    default: module.GameAlphaHostPage,
  })),
);

const GameZeroRoutePage = lazy(() =>
  import("@readirect/game-zero").then((module) => ({
    default: module.GameZeroRoutePage,
  })),
);

const GameTwoHostPage = lazy(() =>
  import("./features/games/GameTwoHostPage").then((module) => ({
    default: module.GameTwoHostPage,
  })),
);

const StaffLoginPage = lazy(() =>
  import("./features/staff-auth/StaffLoginPage").then((module) => ({
    default: module.StaffLoginPage,
  })),
);

const StaffSecurityPage = lazy(() =>
  import("./features/staff-auth/StaffSecurityPage").then((module) => ({
    default: module.StaffSecurityPage,
  })),
);

const SystemAdminDashboardPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminDashboardPage").then(
    (module) => ({ default: module.SystemAdminDashboardPage }),
  ),
);

const SystemAdminSchoolsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminSchoolsPage").then(
    (module) => ({ default: module.SystemAdminSchoolsPage }),
  ),
);

const SystemAdminTeachersPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminTeachersPage").then(
    (module) => ({ default: module.SystemAdminTeachersPage }),
  ),
);

const SystemAdminLearnersPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminLearnersPage").then(
    (module) => ({ default: module.SystemAdminLearnersPage }),
  ),
);

const SystemAdminGuestsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminGuestsPage").then((module) => ({
    default: module.SystemAdminGuestsPage,
  })),
);

const SystemAdminAssessmentsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminAssessmentsPage").then(
    (module) => ({ default: module.SystemAdminAssessmentsPage }),
  ),
);

const SystemAdminLessonsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminLessonsPage").then(
    (module) => ({
      default: module.SystemAdminLessonsPage,
    }),
  ),
);

const SystemAdminLearningRulesPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminLearningRulesPage").then(
    (module) => ({ default: module.SystemAdminLearningRulesPage }),
  ),
);

const SystemAdminAiServicesPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminAiServicesPage").then(
    (module) => ({ default: module.SystemAdminAiServicesPage }),
  ),
);

const SystemAdminAgentSettingsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminAgentSettingsPage").then(
    (module) => ({ default: module.SystemAdminAgentSettingsPage }),
  ),
);

const SystemAdminPromptTemplatesPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminPromptTemplatesPage").then(
    (module) => ({ default: module.SystemAdminPromptTemplatesPage }),
  ),
);

const SystemAdminAuditLogsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminAuditLogsPage").then(
    (module) => ({ default: module.SystemAdminAuditLogsPage }),
  ),
);

const SystemAdminMonitoringPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminMonitoringPage").then(
    (module) => ({ default: module.SystemAdminMonitoringPage }),
  ),
);

const SystemAdminSpeechToolsPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminSpeechToolsPage").then(
    (module) => ({ default: module.SystemAdminSpeechToolsPage }),
  ),
);

const SystemAdminGamesPlayersPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminGamesPlayersPage").then(
    (module) => ({ default: module.SystemAdminGamesPlayersPage }),
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

const SystemAdminDemosPage = lazy(() =>
  import("./features/staff-dashboard/SystemAdminDemosPage").then((module) => ({
    default: module.SystemAdminDemosPage,
  })),
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

const SchoolAdminProfilePage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminProfilePage").then(
    (module) => ({ default: module.SchoolAdminProfilePage }),
  ),
);

const SchoolAdminClassesPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminClassesPage").then(
    (module) => ({ default: module.SchoolAdminClassesPage }),
  ),
);

const SchoolAdminLearnersPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminLearnersPage").then(
    (module) => ({ default: module.SchoolAdminLearnersPage }),
  ),
);

const SchoolAdminLearnerDetailPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminLearnerDetailPage").then(
    (module) => ({ default: module.SchoolAdminLearnerDetailPage }),
  ),
);

const SchoolAdminReportsPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminReportsPage").then(
    (module) => ({ default: module.SchoolAdminReportsPage }),
  ),
);

const SchoolAdminInstructionalInsightsPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminInstructionalInsightsPage").then(
    (module) => ({
      default: module.SchoolAdminInstructionalInsightsPage,
    }),
  ),
);

const SchoolAdminTeacherDashboardsPage = lazy(() =>
  import("./features/staff-dashboard/SchoolAdminTeacherDashboardsPage").then(
    (module) => ({
      default: module.SchoolAdminTeacherDashboardsPage,
    }),
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

const TeacherLearnerImportPage = lazy(() =>
  import("./features/staff-dashboard/TeacherLearnerImportPage").then(
    (module) => ({
      default: module.TeacherLearnerImportPage,
    }),
  ),
);

const TeacherCredentialSheetsPage = lazy(() =>
  import("./features/staff-dashboard/TeacherCredentialSheetsPage").then(
    (module) => ({
      default: module.TeacherCredentialSheetsPage,
    }),
  ),
);

const TeacherLearnerDetailPage = lazy(() =>
  import("./features/staff-dashboard/TeacherLearnerDetailPage").then(
    (module) => ({
      default: module.TeacherLearnerDetailPage,
    }),
  ),
);

const TeacherDiagnosticAssessmentPage = lazy(() =>
  import("./features/staff-dashboard/TeacherDiagnosticAssessmentPage").then(
    (module) => ({
      default: module.TeacherDiagnosticAssessmentPage,
    }),
  ),
);

const TeacherFinalAssessmentPage = lazy(() =>
  import("./features/staff-dashboard/TeacherFinalAssessmentPage").then(
    (module) => ({
      default: module.TeacherFinalAssessmentPage,
    }),
  ),
);

const TeacherReportsPage = lazy(() =>
  import("./features/staff-dashboard/TeacherReportsPage").then((module) => ({
    default: module.TeacherReportsPage,
  })),
);

const TeacherAnalyticsPage = lazy(() =>
  import("./features/staff-dashboard/TeacherAnalyticsPage").then((module) => ({
    default: module.TeacherAnalyticsPage,
  })),
);

function RouteLoading() {
  return (
    <main className="route-loading" aria-live="polite" aria-busy="true">
      <img
        className="route-loading__icon"
        src="/assets/icons/icon.png"
        alt=""
        aria-hidden="true"
      />
      <span>Opening ReaDirect…</span>
    </main>
  );
}

function RootPage() {
  const { search } = useLocation();

  if (Capacitor.isNativePlatform()) {
    return <NativeLearnerEntryPage />;
  }

  return browserRootSurface(window.location.hostname, search) === "intro" ? (
    <IntroPage />
  ) : (
    <Navigate to="/landing" replace />
  );
}

function LandingPage() {
  if (
    Capacitor.isNativePlatform() ||
    isProductionWebAppHostname(window.location.hostname)
  ) {
    return <Navigate to="/" replace />;
  }

  return <BrowserLandingPage />;
}

function LearnerGamesRoute() {
  const session = loadLearnerSession();
  return (
    <GameLobbyPage
      guestUnavailable={!session}
      previewMode={session?.learner.account_purpose === "portal_system"}
    />
  );
}

export function App() {
  return (
    <RouteTransitionProvider>
      <GameLobbySkeletonProvider
        profileClient={learnerGameProfileClient}
        sessionChangeEvent={learnerSessionChangedEvent}
      >
        <LearnerExperienceProvider>
          <NativeConnectivityBanner />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<RootPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/docs" element={<PublicDocsPage />} />
              <Route path="/docs/:docSlug" element={<PublicDocsPage />} />
              <Route
                path="/credits-licenses"
                element={<CreditsLicensesPage />}
              />
              <Route
                path="/learner/modes"
                element={<NativeLearnerEntryPage initialView="modes" />}
              />
              <Route path="/home" element={<HomePage />} />
              <Route path="/learner/login" element={<LearnerLoginPage />} />
              <Route
                path="/learner/dashboard"
                element={<LearnerDashboardPage />}
              />
              <Route
                path="/learner/offline"
                element={<OfflinePracticeHomePage />}
              />
              <Route
                path="/learner/offline/category/:categoryKey"
                element={<OfflinePracticeHomePage />}
              />
              <Route
                path="/learner/offline/:packId"
                element={<OfflinePracticeModulePage />}
              />
              <Route
                path="/learner/lesson-intro"
                element={<ReadingJourneyMenuPage />}
              />
              <Route
                path="/learner/learn-with-clara"
                element={<LearnWithClaraMenuPage />}
              />
              <Route
                path="/learner/learn-with-clara/letters"
                element={<LearnWithClaraLettersPage />}
              />
              <Route
                path="/learner/learn-with-clara/words"
                element={<LearnWithClaraWordsPage />}
              />
              <Route
                path="/learner/learn-with-clara/practice/:practiceKey"
                element={<LearnWithClaraPracticePage />}
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
              <Route
                path="/learner/final-assessment/part-one"
                element={<AssessmentPartOnePage assessmentType="final" />}
              />
              <Route
                path="/learner/final-assessment/part-two"
                element={<AssessmentPartTwoPage assessmentType="final" />}
              />
              <Route
                path="/learner/final-assessment/complete"
                element={<AssessmentPartTwoPage assessmentType="final" />}
              />
              <Route path="/learner/lessons/1" element={<LessonOnePage />} />
              <Route path="/learner/lessons/2" element={<LessonTwoPage />} />
              <Route path="/learner/lessons/3" element={<LessonThreePage />} />
              <Route path="/learner/lessons/4" element={<LessonFourPage />} />
              <Route path="/learner/lessons/5" element={<LessonFivePage />} />
              <Route path="/learner/lessons/6" element={<LessonSixPage />} />
              <Route path="/learner/games" element={<LearnerGamesRoute />} />
              <Route
                path="/learner/games/game-alpha"
                element={
                  <RequireSkeletonGameProfile
                    bypass={() =>
                      loadLearnerSession()?.learner.account_purpose ===
                      "portal_system"
                    }
                  >
                    <GameAlphaHostPage />
                  </RequireSkeletonGameProfile>
                }
              />
              <Route
                path="/learner/games/game-one"
                element={
                  <RequireSkeletonGameProfile
                    bypass={() =>
                      loadLearnerSession()?.learner.account_purpose ===
                      "portal_system"
                    }
                  >
                    <GameOneHostPage />
                  </RequireSkeletonGameProfile>
                }
              />
              <Route
                path="/learner/games/game-zero"
                element={
                  <RequireSkeletonGameProfile>
                    <GameZeroRoutePage />
                  </RequireSkeletonGameProfile>
                }
              />
              <Route
                path="/learner/games/game-two"
                element={
                  <RequireSkeletonGameProfile
                    bypass={() =>
                      loadLearnerSession()?.learner.account_purpose ===
                      "portal_system"
                    }
                  >
                    <GameTwoHostPage />
                  </RequireSkeletonGameProfile>
                }
              />
              <Route path="/staff/login" element={<StaffLoginPage />} />
              <Route
                element={
                  <RequireStaffRole
                    allowedRoles={["system_admin", "school_admin", "teacher"]}
                  />
                }
              >
                <Route path="/staff/security" element={<StaffSecurityPage />} />
              </Route>
              <Route
                element={<RequireStaffRole allowedRoles={["system_admin"]} />}
              >
                <Route
                  path="/staff/system-admin"
                  element={<SystemAdminDashboardPage />}
                />
                <Route
                  path="/staff/system-admin/demos"
                  element={<SystemAdminDemosPage />}
                />
                <Route
                  path="/staff/system-admin/schools"
                  element={<SystemAdminSchoolsPage />}
                />
                <Route
                  path="/staff/system-admin/teachers"
                  element={<SystemAdminTeachersPage />}
                />
                <Route
                  path="/staff/system-admin/learners"
                  element={<SystemAdminLearnersPage />}
                />
                <Route
                  path="/staff/system-admin/guests"
                  element={<SystemAdminGuestsPage />}
                />
                <Route
                  path="/staff/system-admin/assessments"
                  element={<SystemAdminAssessmentsPage />}
                />
                <Route
                  path="/staff/system-admin/lessons"
                  element={<SystemAdminLessonsPage />}
                />
                <Route
                  path="/staff/system-admin/rules-and-thresholds"
                  element={<SystemAdminLearningRulesPage />}
                />
                <Route
                  path="/staff/system-admin/ai-services"
                  element={<SystemAdminAiServicesPage />}
                />
                <Route
                  path="/staff/system-admin/agent-settings"
                  element={<SystemAdminAgentSettingsPage />}
                />
                <Route
                  path="/staff/system-admin/prompt-templates"
                  element={<SystemAdminPromptTemplatesPage />}
                />
                <Route
                  path="/staff/system-admin/audit-logs"
                  element={<SystemAdminAuditLogsPage />}
                />
                <Route
                  path="/staff/system-admin/system-monitoring"
                  element={<SystemAdminMonitoringPage />}
                />
                <Route
                  path="/staff/system-admin/speech-tools"
                  element={<SystemAdminSpeechToolsPage />}
                />
                <Route
                  path="/staff/system-admin/games-and-players"
                  element={<SystemAdminGamesPlayersPage />}
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
              </Route>
              <Route
                element={<RequireStaffRole allowedRoles={["school_admin"]} />}
              >
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
                <Route
                  path="/staff/school-admin/profile"
                  element={<SchoolAdminProfilePage />}
                />
                <Route
                  path="/staff/school-admin/classes"
                  element={<SchoolAdminClassesPage />}
                />
                <Route
                  path="/staff/school-admin/learners"
                  element={<SchoolAdminLearnersPage />}
                />
                <Route
                  path="/staff/school-admin/learners/:learnerId"
                  element={<SchoolAdminLearnerDetailPage />}
                />
                <Route
                  path="/staff/school-admin/instructional-insights"
                  element={<SchoolAdminInstructionalInsightsPage />}
                />
                <Route
                  path="/staff/school-admin/reports"
                  element={<SchoolAdminReportsPage />}
                />
                <Route
                  path="/staff/school-admin/teacher-dashboards"
                  element={<SchoolAdminTeacherDashboardsPage />}
                />
              </Route>
              <Route element={<RequireStaffRole allowedRoles={["teacher"]} />}>
                <Route
                  path="/staff/teacher"
                  element={<TeacherDashboardPage />}
                />
                <Route
                  path="/staff/teacher/learners"
                  element={<LearnerAccountsPage />}
                />
                <Route
                  path="/staff/teacher/learners/import"
                  element={<TeacherLearnerImportPage />}
                />
                <Route
                  path="/staff/teacher/learners/credentials"
                  element={<TeacherCredentialSheetsPage />}
                />
                <Route
                  path="/staff/teacher/learners/:learnerId"
                  element={<TeacherLearnerDetailPage />}
                />
                <Route
                  path="/staff/teacher/assessments/diagnostic"
                  element={<TeacherDiagnosticAssessmentPage />}
                />
                <Route
                  path="/staff/teacher/assessments/final"
                  element={<TeacherFinalAssessmentPage />}
                />
                <Route
                  path="/staff/teacher/reports"
                  element={<TeacherReportsPage />}
                />
                <Route
                  path="/staff/teacher/analytics"
                  element={<TeacherAnalyticsPage />}
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </LearnerExperienceProvider>
      </GameLobbySkeletonProvider>
    </RouteTransitionProvider>
  );
}
