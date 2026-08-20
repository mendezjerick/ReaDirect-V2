<?php

use App\Http\Controllers\LearnerAssessmentPartOneController;
use App\Http\Controllers\LearnerAssessmentPartTwoController;
use App\Http\Controllers\LearnerAuthController;
use App\Http\Controllers\LearnerClaraListeningController;
use App\Http\Controllers\LearnerDiagnosticSkipController;
use App\Http\Controllers\LearnerExperienceController;
use App\Http\Controllers\LearnerGameProfileController;
use App\Http\Controllers\LearnerGameSaveController;
use App\Http\Controllers\LearnerLessonFiveController;
use App\Http\Controllers\LearnerLessonFourController;
use App\Http\Controllers\LearnerLessonOneController;
use App\Http\Controllers\LearnerLessonSixController;
use App\Http\Controllers\LearnerLessonThreeController;
use App\Http\Controllers\LearnerLessonTwoController;
use App\Http\Controllers\LearnerOfflinePracticeController;
use App\Http\Controllers\LearnerSpeechLanguageController;
use App\Http\Controllers\LearnerTtsController;
use App\Http\Controllers\SchoolAdminClassController;
use App\Http\Controllers\SchoolAdminInstructionalInsightsController;
use App\Http\Controllers\SchoolAdministratorController;
use App\Http\Controllers\SchoolAdminLearnerController;
use App\Http\Controllers\SchoolAdminReportController;
use App\Http\Controllers\SchoolAdminTeacherController;
use App\Http\Controllers\SchoolAdminTeacherDashboardController;
use App\Http\Controllers\SchoolAdminWorkspaceController;
use App\Http\Controllers\StaffAuthController;
use App\Http\Controllers\StaffRealtimeController;
use App\Http\Controllers\StaffSecurityController;
use App\Http\Controllers\SystemAdminAgentsAiController;
use App\Http\Controllers\SystemAdminEquivalenceController;
use App\Http\Controllers\SystemAdminGuestController;
use App\Http\Controllers\SystemAdminLearnerController;
use App\Http\Controllers\SystemAdminLearnerExperienceSettingsController;
use App\Http\Controllers\SystemAdminLearningContentController;
use App\Http\Controllers\SystemAdminOperationsController;
use App\Http\Controllers\SystemAdminOverviewController;
use App\Http\Controllers\SystemAdminPortalController;
use App\Http\Controllers\SystemAdminSchoolController;
use App\Http\Controllers\SystemAdminSpeechAnalyticsController;
use App\Http\Controllers\SystemAdminSpeechSandboxController;
use App\Http\Controllers\SystemAdminSpeechSettingsController;
use App\Http\Controllers\SystemAdminTeacherController;
use App\Http\Controllers\TeacherAnalyticsController;
use App\Http\Controllers\TeacherDiagnosticAssessmentController;
use App\Http\Controllers\TeacherFinalAssessmentController;
use App\Http\Controllers\TeacherLearnerController;
use App\Http\Controllers\TeacherReportController;
use App\Http\Controllers\TeacherWorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('staff')->group(function (): void {
    Route::post('/login', [StaffAuthController::class, 'store'])
        ->middleware('throttle:10,1');

    Route::middleware('staff.auth')->group(function (): void {
        Route::get('/session', [StaffAuthController::class, 'show']);
        Route::post('/session/heartbeat', [StaffAuthController::class, 'heartbeat']);
        Route::post('/logout', [StaffAuthController::class, 'destroy']);
        Route::post('/security/email-verification', [StaffSecurityController::class, 'requestEmailVerification'])
            ->middleware('throttle:staff-security-code-request');
        Route::post('/security/email-verification/confirm', [StaffSecurityController::class, 'verifyEmail'])
            ->middleware('throttle:staff-security-code-verify');
        Route::post('/security/password-change-code', [StaffSecurityController::class, 'requestPasswordChangeCode'])
            ->middleware('throttle:staff-security-code-request');
        Route::put('/security/password', [StaffSecurityController::class, 'updatePassword'])
            ->middleware('throttle:staff-security-code-verify');
        Route::get('/realtime/config', [StaffRealtimeController::class, 'config']);
        Route::post('/realtime/probe', [StaffRealtimeController::class, 'probe']);

        Route::middleware('staff.role:system_admin')->prefix('system-admin')->group(function (): void {
            Route::get('/overview', [SystemAdminOverviewController::class, 'show']);
            Route::get('/schools', [SystemAdminSchoolController::class, 'index']);
            Route::get('/teachers', [SystemAdminTeacherController::class, 'index']);
            Route::get('/learners', [SystemAdminLearnerController::class, 'index']);
            Route::get('/guests', [SystemAdminGuestController::class, 'index']);
            Route::patch('/guests/{guestAccount}/access', [SystemAdminGuestController::class, 'updateAccess'])
                ->whereNumber('guestAccount');
            Route::get('/learning-content/assessments', [SystemAdminLearningContentController::class, 'assessments']);
            Route::get('/learning-content/lessons', [SystemAdminLearningContentController::class, 'lessons']);
            Route::get('/learning-content/rules', [SystemAdminLearningContentController::class, 'rules']);
            Route::get('/agents-ai/settings', [SystemAdminAgentsAiController::class, 'settings']);
            Route::put('/agents-ai/lightweight-mode', [SystemAdminLearnerExperienceSettingsController::class, 'update']);
            Route::get('/agents-ai/prompt-templates', [SystemAdminAgentsAiController::class, 'promptTemplates']);
            Route::get('/operations/audit-logs', [SystemAdminOperationsController::class, 'auditLogs']);
            Route::get('/operations/games-and-players', [SystemAdminOperationsController::class, 'gamesAndPlayers']);
            Route::get('/school-administrators', [SchoolAdministratorController::class, 'index']);
            Route::post('/school-administrators', [SchoolAdministratorController::class, 'store']);
            Route::get('/{staffUser}/page-portals', [SystemAdminPortalController::class, 'show']);
            Route::post('/{staffUser}/page-portals/reset-kristen', [SystemAdminPortalController::class, 'reset']);
            Route::post('/{staffUser}/page-portals/launch', [SystemAdminPortalController::class, 'launch']);
            Route::get('/{staffUser}/speech/status', [SystemAdminSpeechSandboxController::class, 'status']);
            Route::get('/{staffUser}/speech/content-catalog', [SystemAdminSpeechSandboxController::class, 'contentCatalog']);
            Route::post('/{staffUser}/speech/letter/resolve', [SystemAdminSpeechSandboxController::class, 'resolveLetter']);
            Route::post('/{staffUser}/speech/mu/transcribe', [SystemAdminSpeechSandboxController::class, 'transcribeMu']);
            Route::post('/{staffUser}/speech/attempts/{speechSandboxAttempt}/review', [SystemAdminSpeechSandboxController::class, 'reviewAttempt']);
            Route::get('/{staffUser}/speech/confusion-matrix/raw', [SystemAdminSpeechAnalyticsController::class, 'rawConfusionMatrix']);
            Route::post('/{staffUser}/equivalence-rules', [SystemAdminSpeechSandboxController::class, 'storeEquivalenceRule']);
            Route::get('/{staffUser}/equivalence-rules', [SystemAdminEquivalenceController::class, 'index']);
            Route::patch('/{staffUser}/equivalence-rules/{equivalenceRule}', [SystemAdminEquivalenceController::class, 'update']);
            Route::put('/{staffUser}/speech-settings/mu-noise-reduction', [SystemAdminSpeechSettingsController::class, 'update']);
        });

        Route::middleware('staff.role:school_admin')->prefix('school-admin')->group(function (): void {
            Route::post('/{staffUser}/school', [SchoolAdminWorkspaceController::class, 'updateSchool']);
            Route::get('/{staffUser}/school-profile', [SchoolAdminWorkspaceController::class, 'schoolProfile']);
            Route::put('/{staffUser}/school-profile', [SchoolAdminWorkspaceController::class, 'updateSchoolProfile']);
            Route::get('/{staffUser}/overview', [SchoolAdminWorkspaceController::class, 'overview']);
            Route::get('/{staffUser}/classes', [SchoolAdminClassController::class, 'index']);
            Route::put('/{staffUser}/classes/{teacher}', [SchoolAdminClassController::class, 'update'])
                ->whereNumber('teacher');
            Route::get('/{staffUser}/learners', [SchoolAdminLearnerController::class, 'index']);
            Route::get('/{staffUser}/learners/{learner}', [SchoolAdminLearnerController::class, 'show'])
                ->whereNumber('learner');
            Route::get('/{staffUser}/instructional-insights', [SchoolAdminInstructionalInsightsController::class, 'show']);
            Route::get('/{staffUser}/reports', [SchoolAdminReportController::class, 'show']);
            Route::get('/{staffUser}/teacher-dashboards/{teacher}', [SchoolAdminTeacherDashboardController::class, 'show'])
                ->whereNumber('teacher');
            Route::get('/{staffUser}/teachers', [SchoolAdminTeacherController::class, 'index']);
            Route::post('/{staffUser}/teachers', [SchoolAdminTeacherController::class, 'store']);
        });

        Route::middleware('staff.role:teacher')->prefix('teacher')->group(function (): void {
            Route::get('/{staffUser}/overview', [TeacherWorkspaceController::class, 'overview']);
            Route::post('/{staffUser}/assignment-acknowledgement', [TeacherWorkspaceController::class, 'acknowledgeAssignment']);
            Route::get('/{staffUser}/assessments/diagnostic', [TeacherDiagnosticAssessmentController::class, 'index']);
            Route::get('/{staffUser}/assessments/final', [TeacherFinalAssessmentController::class, 'index']);
            Route::get('/{staffUser}/analytics', [TeacherAnalyticsController::class, 'show']);
            Route::get('/{staffUser}/reports', [TeacherReportController::class, 'show']);
            Route::get('/{staffUser}/learners', [TeacherLearnerController::class, 'index']);
            Route::post('/{staffUser}/learners/import', [TeacherLearnerController::class, 'import']);
            Route::post('/{staffUser}/learners/credential-sheet', [TeacherLearnerController::class, 'credentialSheet']);
            Route::get('/{staffUser}/learners/{learner}', [TeacherLearnerController::class, 'show'])
                ->whereNumber('learner');
            Route::post('/{staffUser}/learners/{learner}/reset-password', [TeacherLearnerController::class, 'resetPassword'])
                ->whereNumber('learner');
            Route::post('/{staffUser}/learners', [TeacherLearnerController::class, 'store']);
        });
    });
});

Route::prefix('learners')->group(function (): void {
    Route::post('/login', [LearnerAuthController::class, 'store'])
        ->middleware('throttle:learner-login');
});

Route::prefix('learners')->middleware('learner.auth')->group(function (): void {
    Route::get('/session', [LearnerAuthController::class, 'show']);
    Route::post('/session/heartbeat', [LearnerAuthController::class, 'heartbeat']);
    Route::post('/logout', [LearnerAuthController::class, 'destroy']);
    Route::post('/assessments/diagnostic/skip', LearnerDiagnosticSkipController::class);
    Route::get('/experience/settings', [LearnerExperienceController::class, 'show']);
    Route::get('/tts/language', [LearnerSpeechLanguageController::class, 'show']);
    Route::put('/tts/language', [LearnerSpeechLanguageController::class, 'update']);
    Route::get('/games/profile', [LearnerGameProfileController::class, 'show']);
    Route::post('/games/profile', [LearnerGameProfileController::class, 'store']);
    Route::get('/games/{gameKey}/save', [LearnerGameSaveController::class, 'show'])
        ->where('gameKey', '[a-z0-9]+(?:-[a-z0-9]+)*');
    Route::put('/games/{gameKey}/save', [LearnerGameSaveController::class, 'update'])
        ->where('gameKey', '[a-z0-9]+(?:-[a-z0-9]+)*');
    Route::post('/games/{gameKey}/new-game', [LearnerGameSaveController::class, 'reset'])
        ->where('gameKey', '[a-z0-9]+(?:-[a-z0-9]+)*');
    Route::get('/tts/activity-manifest', [LearnerTtsController::class, 'activityManifest']);
    Route::post('/tts/activity-readiness', [LearnerTtsController::class, 'activityReadiness']);
    Route::post('/tts/speech/{speechKey}', [LearnerTtsController::class, 'speech']);
    Route::post('/tts/lesson-feedback/{lessonResponse}', [LearnerTtsController::class, 'lessonFeedback']);
    Route::post('/tts/lesson-demonstration/{lessonResponse}', [LearnerTtsController::class, 'lessonDemonstration']);
    Route::prefix('offline-practice')->middleware('throttle:learner-offline-practice')->group(function (): void {
        Route::get('/packs', [LearnerOfflinePracticeController::class, 'index'])
            ->name('learner.offline-practice.packs');
        Route::get('/packs/{packId}/manifest', [LearnerOfflinePracticeController::class, 'manifest'])
            ->where('packId', '[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*')
            ->name('learner.offline-practice.manifest');
        Route::get('/packs/{packId}/versions/{version}/content', [LearnerOfflinePracticeController::class, 'content'])
            ->where([
                'packId' => '[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*',
                'version' => '[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*',
            ])
            ->name('learner.offline-practice.content');
        Route::get('/packs/{packId}/versions/{version}/assets/{assetId}', [LearnerOfflinePracticeController::class, 'asset'])
            ->where([
                'packId' => '[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*',
                'version' => '[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*',
                'assetId' => '[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*',
            ])
            ->name('learner.offline-practice.asset');
    });
    Route::post('/learn-with-clara/letters/start', [LearnerClaraListeningController::class, 'start']);
    Route::post('/learn-with-clara/letters/advance', [LearnerClaraListeningController::class, 'advance']);
    Route::post('/learn-with-clara/letters/restart', [LearnerClaraListeningController::class, 'restart']);
    Route::post('/lessons/lesson-1/start', [LearnerLessonOneController::class, 'start']);
    Route::get('/lessons/lesson-1/{lessonRun}', [LearnerLessonOneController::class, 'show']);
    Route::post('/lessons/lesson-1/{lessonRun}/submit', [LearnerLessonOneController::class, 'submit']);
    Route::post('/lessons/lesson-1/{lessonRun}/continue-support', [LearnerLessonOneController::class, 'continueSupport']);
    Route::post('/lessons/lesson-1/{lessonRun}/skip', [LearnerLessonOneController::class, 'skip']);
    Route::post('/lessons/lesson-1/{lessonRun}/advance', [LearnerLessonOneController::class, 'advance']);
    Route::post('/lessons/lesson-2/start', [LearnerLessonTwoController::class, 'start']);
    Route::get('/lessons/lesson-2/{lessonRun}', [LearnerLessonTwoController::class, 'show']);
    Route::post('/lessons/lesson-2/{lessonRun}/submit', [LearnerLessonTwoController::class, 'submit']);
    Route::post('/lessons/lesson-2/{lessonRun}/continue-support', [LearnerLessonTwoController::class, 'continueSupport']);
    Route::post('/lessons/lesson-2/{lessonRun}/skip', [LearnerLessonTwoController::class, 'skip']);
    Route::post('/lessons/lesson-2/{lessonRun}/advance', [LearnerLessonTwoController::class, 'advance']);
    Route::post('/lessons/lesson-3/start', [LearnerLessonThreeController::class, 'start']);
    Route::get('/lessons/lesson-3/{lessonRun}', [LearnerLessonThreeController::class, 'show']);
    Route::post('/lessons/lesson-3/{lessonRun}/submit', [LearnerLessonThreeController::class, 'submit']);
    Route::post('/lessons/lesson-3/{lessonRun}/continue-support', [LearnerLessonThreeController::class, 'continueSupport']);
    Route::post('/lessons/lesson-3/{lessonRun}/skip', [LearnerLessonThreeController::class, 'skip']);
    Route::post('/lessons/lesson-3/{lessonRun}/advance', [LearnerLessonThreeController::class, 'advance']);
    Route::post('/lessons/lesson-4/start', [LearnerLessonFourController::class, 'start']);
    Route::get('/lessons/lesson-4/{lessonRun}', [LearnerLessonFourController::class, 'show']);
    Route::post('/lessons/lesson-4/{lessonRun}/submit', [LearnerLessonFourController::class, 'submit']);
    Route::post('/lessons/lesson-4/{lessonRun}/continue-support', [LearnerLessonFourController::class, 'continueSupport']);
    Route::post('/lessons/lesson-4/{lessonRun}/skip', [LearnerLessonFourController::class, 'skip']);
    Route::post('/lessons/lesson-4/{lessonRun}/advance', [LearnerLessonFourController::class, 'advance']);
    Route::post('/lessons/lesson-5/start', [LearnerLessonFiveController::class, 'start']);
    Route::get('/lessons/lesson-5/{lessonRun}', [LearnerLessonFiveController::class, 'show']);
    Route::post('/lessons/lesson-5/{lessonRun}/submit', [LearnerLessonFiveController::class, 'submit']);
    Route::post('/lessons/lesson-5/{lessonRun}/continue-support', [LearnerLessonFiveController::class, 'continueSupport']);
    Route::post('/lessons/lesson-5/{lessonRun}/skip', [LearnerLessonFiveController::class, 'skip']);
    Route::post('/lessons/lesson-5/{lessonRun}/advance', [LearnerLessonFiveController::class, 'advance']);
    Route::post('/lessons/lesson-5/{lessonRun}/continue-review', [LearnerLessonFiveController::class, 'continueReview']);
    Route::post('/lessons/lesson-6/start', [LearnerLessonSixController::class, 'start']);
    Route::get('/lessons/lesson-6/{lessonRun}', [LearnerLessonSixController::class, 'show']);
    Route::post('/lessons/lesson-6/{lessonRun}/submit', [LearnerLessonSixController::class, 'submit']);
    Route::post('/lessons/lesson-6/{lessonRun}/skip', [LearnerLessonSixController::class, 'skip']);
    Route::post('/lessons/lesson-6/{lessonRun}/advance', [LearnerLessonSixController::class, 'advance']);
    foreach ([
        'diagnostic' => 'assessments',
        'final' => 'assessments/final',
    ] as $assessmentType => $assessmentPrefix) {
        Route::post("/{$assessmentPrefix}/part-one/start", [LearnerAssessmentPartOneController::class, 'start'])
            ->defaults('assessmentType', $assessmentType);
        Route::get("/{$assessmentPrefix}/part-one/{assessmentRun}", [LearnerAssessmentPartOneController::class, 'show'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-one/{assessmentRun}/orientation", [LearnerAssessmentPartOneController::class, 'submitOrientation'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-one/{assessmentRun}/speech", [LearnerAssessmentPartOneController::class, 'submitSpeech'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-one/{assessmentRun}/rhyme", [LearnerAssessmentPartOneController::class, 'submitRhyme'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-one/{assessmentRun}/skip", [LearnerAssessmentPartOneController::class, 'skip'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-one/{assessmentRun}/advance", [LearnerAssessmentPartOneController::class, 'advance'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-one/{assessmentRun}/continue", [LearnerAssessmentPartOneController::class, 'continueResult'])
            ->defaults('assessmentType', $assessmentType);
        Route::get("/{$assessmentPrefix}/part-two/current", [LearnerAssessmentPartTwoController::class, 'show'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-two/{assessmentRun}/story", [LearnerAssessmentPartTwoController::class, 'selectStory'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-two/{assessmentRun}/passage", [LearnerAssessmentPartTwoController::class, 'submitPassage'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-two/{assessmentRun}/comprehension", [LearnerAssessmentPartTwoController::class, 'submitComprehension'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-two/{assessmentRun}/skip", [LearnerAssessmentPartTwoController::class, 'skip'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-two/{assessmentRun}/continue", [LearnerAssessmentPartTwoController::class, 'continueResult'])
            ->defaults('assessmentType', $assessmentType);
        Route::post("/{$assessmentPrefix}/part-two/{assessmentRun}/finish", [LearnerAssessmentPartTwoController::class, 'finish'])
            ->defaults('assessmentType', $assessmentType);
    }
});

Route::get('/experience/intro/settings', [LearnerExperienceController::class, 'intro']);
