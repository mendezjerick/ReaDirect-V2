<?php

namespace App\Http\Controllers;

use App\Models\AssessmentRun;
use App\Models\StaffUser;
use App\Services\TeacherAssessmentReviewService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TeacherDiagnosticAssessmentController extends Controller
{
    public function index(
        StaffUser $staffUser,
        TeacherAssessmentReviewService $review,
    ): JsonResponse {
        if ($staffUser->role !== 'teacher' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null || $staffUser->grade_level === null || $staffUser->section === null) {
            throw new HttpException(409, 'A school, grade level, and section assignment are required before reviewing assessments.');
        }

        return response()->json(
            $review->build($staffUser, AssessmentRun::TYPE_DIAGNOSTIC),
        );
    }
}
