<?php

namespace App\Http\Controllers;

use App\Models\StaffUser;
use App\Services\TeacherReportService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TeacherReportController extends Controller
{
    public function show(
        StaffUser $staffUser,
        TeacherReportService $reports,
    ): JsonResponse {
        if ($staffUser->role !== 'teacher' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null || $staffUser->grade_level === null || $staffUser->section === null) {
            throw new HttpException(409, 'A complete class assignment is required before opening reports.');
        }

        return response()->json($reports->build($staffUser));
    }
}
