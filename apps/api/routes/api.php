<?php

use App\Http\Controllers\LearnerAssessmentPartOneController;
use App\Http\Controllers\LearnerAssessmentPartTwoController;
use App\Http\Controllers\LearnerAuthController;
use App\Http\Controllers\LearnerClaraListeningController;
use App\Http\Controllers\LearnerLessonFiveController;
use App\Http\Controllers\LearnerLessonFourController;
use App\Http\Controllers\LearnerLessonOneController;
use App\Http\Controllers\LearnerLessonSixController;
use App\Http\Controllers\LearnerLessonThreeController;
use App\Http\Controllers\LearnerLessonTwoController;
use App\Http\Controllers\LearnerTtsController;
use App\Http\Controllers\SchoolAdministratorController;
use App\Http\Controllers\SchoolAdminTeacherController;
use App\Http\Controllers\SchoolAdminWorkspaceController;
use App\Http\Controllers\StaffAuthController;
use App\Http\Controllers\SystemAdminEquivalenceController;
use App\Http\Controllers\SystemAdminOverviewController;
use App\Http\Controllers\SystemAdminPortalController;
use App\Http\Controllers\SystemAdminSpeechAnalyticsController;
use App\Http\Controllers\SystemAdminSpeechSandboxController;
use App\Http\Controllers\SystemAdminSpeechSettingsController;
use App\Http\Controllers\TeacherLearnerController;
use App\Http\Controllers\TeacherWorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('staff')->group(function (): void {
    Route::post('/login', [StaffAuthController::class, 'store']);
    Route::get('/system-admin/overview', [SystemAdminOverviewController::class, 'show']);
    Route::get('/system-admin/school-administrators', [SchoolAdministratorController::class, 'index']);
    Route::post('/system-admin/school-administrators', [SchoolAdministratorController::class, 'store']);
    Route::get('/system-admin/{staffUser}/page-portals', [SystemAdminPortalController::class, 'show']);
    Route::post('/system-admin/{staffUser}/page-portals/reset-kristen', [SystemAdminPortalController::class, 'reset']);
    Route::post('/system-admin/{staffUser}/page-portals/launch', [SystemAdminPortalController::class, 'launch']);
    Route::get('/system-admin/{staffUser}/speech/status', [SystemAdminSpeechSandboxController::class, 'status']);
    Route::get('/system-admin/{staffUser}/speech/content-catalog', [SystemAdminSpeechSandboxController::class, 'contentCatalog']);
    Route::post('/system-admin/{staffUser}/speech/letter/resolve', [SystemAdminSpeechSandboxController::class, 'resolveLetter']);
    Route::post('/system-admin/{staffUser}/speech/mu/transcribe', [SystemAdminSpeechSandboxController::class, 'transcribeMu']);
    Route::post('/system-admin/{staffUser}/speech/attempts/{speechSandboxAttempt}/review', [SystemAdminSpeechSandboxController::class, 'reviewAttempt']);
    Route::get('/system-admin/{staffUser}/speech/confusion-matrix/raw', [SystemAdminSpeechAnalyticsController::class, 'rawConfusionMatrix']);
    Route::post('/system-admin/{staffUser}/equivalence-rules', [SystemAdminSpeechSandboxController::class, 'storeEquivalenceRule']);
    Route::get('/system-admin/{staffUser}/equivalence-rules', [SystemAdminEquivalenceController::class, 'index']);
    Route::patch('/system-admin/{staffUser}/equivalence-rules/{equivalenceRule}', [SystemAdminEquivalenceController::class, 'update']);
    Route::put('/system-admin/{staffUser}/speech-settings/mu-noise-reduction', [SystemAdminSpeechSettingsController::class, 'update']);
    Route::post('/school-admin/{staffUser}/school', [SchoolAdminWorkspaceController::class, 'updateSchool']);
    Route::get('/school-admin/{staffUser}/overview', [SchoolAdminWorkspaceController::class, 'overview']);
    Route::get('/school-admin/{staffUser}/teachers', [SchoolAdminTeacherController::class, 'index']);
    Route::post('/school-admin/{staffUser}/teachers', [SchoolAdminTeacherController::class, 'store']);
    Route::get('/teacher/{staffUser}/overview', [TeacherWorkspaceController::class, 'overview']);
    Route::post('/teacher/{staffUser}/assignment-acknowledgement', [TeacherWorkspaceController::class, 'acknowledgeAssignment']);
    Route::get('/teacher/{staffUser}/learners', [TeacherLearnerController::class, 'index']);
    Route::post('/teacher/{staffUser}/learners', [TeacherLearnerController::class, 'store']);
});

Route::prefix('learners')->group(function (): void {
    Route::post('/login', [LearnerAuthController::class, 'store']);
    Route::get('/session', [LearnerAuthController::class, 'show']);
    Route::post('/logout', [LearnerAuthController::class, 'destroy']);
    Route::get('/tts/activity-manifest', [LearnerTtsController::class, 'activityManifest']);
    Route::post('/tts/activity-readiness', [LearnerTtsController::class, 'activityReadiness']);
    Route::post('/tts/speech/{speechKey}', [LearnerTtsController::class, 'speech']);
    Route::post('/tts/lesson-feedback/{lessonResponse}', [LearnerTtsController::class, 'lessonFeedback']);
    Route::post('/tts/lesson-demonstration/{lessonResponse}', [LearnerTtsController::class, 'lessonDemonstration']);
    Route::post('/learn-with-clara/lesson-1/start', [LearnerClaraListeningController::class, 'start']);
    Route::post('/learn-with-clara/lesson-1/advance', [LearnerClaraListeningController::class, 'advance']);
    Route::post('/learn-with-clara/lesson-1/restart', [LearnerClaraListeningController::class, 'restart']);
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
