<?php

use App\Http\Controllers\LearnerAssessmentPartOneController;
use App\Http\Controllers\LearnerAuthController;
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
    Route::post('/tts/speech/{speechKey}', [LearnerTtsController::class, 'speech']);
    Route::post('/assessments/part-one/start', [LearnerAssessmentPartOneController::class, 'start']);
    Route::get('/assessments/part-one/{assessmentRun}', [LearnerAssessmentPartOneController::class, 'show']);
    Route::post('/assessments/part-one/{assessmentRun}/orientation', [LearnerAssessmentPartOneController::class, 'submitOrientation']);
    Route::post('/assessments/part-one/{assessmentRun}/speech', [LearnerAssessmentPartOneController::class, 'submitSpeech']);
    Route::post('/assessments/part-one/{assessmentRun}/rhyme', [LearnerAssessmentPartOneController::class, 'submitRhyme']);
    Route::post('/assessments/part-one/{assessmentRun}/skip', [LearnerAssessmentPartOneController::class, 'skip']);
    Route::post('/assessments/part-one/{assessmentRun}/advance', [LearnerAssessmentPartOneController::class, 'advance']);
});
