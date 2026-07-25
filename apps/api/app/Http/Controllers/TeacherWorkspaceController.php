<?php

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\TeacherOverviewService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TeacherWorkspaceController extends Controller
{
    public function overview(
        StaffUser $staffUser,
        TeacherOverviewService $overview,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);
        $staffUser->load('school:id,name');
        $classOverview = $overview->build($staffUser);

        return response()->json([
            'school' => [
                'id' => $staffUser->school->id,
                'name' => $staffUser->school->name,
            ],
            'assignment' => [
                'grade_level' => $staffUser->grade_level,
                'section' => $staffUser->section,
            ],
            ...$classOverview,
            'teacher_lessons' => [],
            'requires_assignment_acknowledgement' => $staffUser->teacher_assignment_acknowledged_at === null,
            'requires_credential_setup' => $staffUser->requires_credential_setup,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    public function acknowledgeAssignment(StaffUser $staffUser): JsonResponse
    {
        $this->assertReadyTeacher($staffUser);

        if ($staffUser->teacher_assignment_acknowledged_at === null) {
            $staffUser->forceFill([
                'teacher_assignment_acknowledged_at' => now(),
            ])->save();

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'teacher.assignment_acknowledged',
                'description' => "Acknowledged Grade {$staffUser->grade_level} Section {$staffUser->section} assignment.",
                'metadata' => [
                    'school_id' => $staffUser->school_id,
                    'grade_level' => $staffUser->grade_level,
                    'section' => $staffUser->section,
                ],
            ]);
        }

        return response()->json([
            'requires_assignment_acknowledgement' => false,
            'acknowledged_at' => $staffUser->teacher_assignment_acknowledged_at?->toIso8601String(),
        ]);
    }

    private function assertReadyTeacher(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'teacher' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null || $staffUser->grade_level === null || $staffUser->section === null) {
            throw new HttpException(409, 'A school, grade level, and section assignment are required before opening the Teacher Dashboard.');
        }
    }
}
