<?php

namespace App\Http\Controllers;

use App\Models\StaffUser;
use App\Services\TeacherOverviewService;
use App\Services\TeacherReportService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminTeacherDashboardController extends Controller
{
    public function __construct(
        private readonly TeacherOverviewService $overviews,
        private readonly TeacherReportService $reports,
    ) {}

    public function show(
        StaffUser $staffUser,
        StaffUser $teacher,
    ): JsonResponse {
        $this->assertReadyAdministrator($staffUser);

        if (
            $teacher->role !== 'teacher'
            || $teacher->school_id !== $staffUser->school_id
            || $teacher->grade_level === null
            || $teacher->section === null
        ) {
            abort(404);
        }

        $teacher->loadMissing('school:id,name');

        return response()->json([
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->display_name,
                'username' => $teacher->username,
                'is_active' => (bool) $teacher->is_active,
                'grade_level' => $teacher->grade_level,
                'section' => $teacher->section,
            ],
            'overview' => $this->overviews->build($teacher),
            'report' => $this->reports->build($teacher),
            'read_only' => true,
            'impersonating' => false,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    private function assertReadyAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'school_admin' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null) {
            throw new HttpException(
                409,
                'School setup is required before reviewing Teacher dashboards.',
            );
        }
    }
}
