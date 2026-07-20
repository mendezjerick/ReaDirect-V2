<?php

use App\Http\Controllers\LearnerAuthController;
use App\Http\Controllers\SchoolAdministratorController;
use App\Http\Controllers\SchoolAdminTeacherController;
use App\Http\Controllers\SchoolAdminWorkspaceController;
use App\Http\Controllers\StaffAuthController;
use App\Http\Controllers\SystemAdminOverviewController;
use App\Http\Controllers\SystemAdminPortalController;
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
});
