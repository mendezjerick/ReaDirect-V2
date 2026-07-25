<?php

namespace App\Http\Controllers;

use App\Models\StaffUser;
use App\Services\TeacherAnalyticsService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TeacherAnalyticsController extends Controller
{
    public function show(
        StaffUser $staffUser,
        TeacherAnalyticsService $analytics,
    ): JsonResponse {
        if ($staffUser->role !== 'teacher' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null || $staffUser->grade_level === null || $staffUser->section === null) {
            throw new HttpException(409, 'A complete class assignment is required before opening analytics.');
        }

        return response()->json($analytics->build($staffUser));
    }
}
