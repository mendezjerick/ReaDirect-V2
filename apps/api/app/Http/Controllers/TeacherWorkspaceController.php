<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TeacherWorkspaceController extends Controller
{
    public function overview(StaffUser $staffUser): JsonResponse
    {
        $this->assertReadyTeacher($staffUser);
        $staffUser->load('school:id,name');
        $totalLearners = Learner::query()
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->where('teacher_id', $staffUser->id)
            ->count();

        return response()->json([
            'school' => [
                'id' => $staffUser->school->id,
                'name' => $staffUser->school->name,
            ],
            'assignment' => [
                'grade_level' => $staffUser->grade_level,
                'section' => $staffUser->section,
            ],
            'metrics' => [
                'total_learners' => $totalLearners,
                'diagnostic_complete' => 0,
                'diagnostic_pending' => $totalLearners,
                'ready_for_final' => 0,
                'final_complete' => 0,
            ],
            'part_one_distribution' => [
                ['label' => 'Full Refresher', 'value' => 0],
                ['label' => 'Moderate Refresher', 'value' => 0],
                ['label' => 'Light Refresher', 'value' => 0],
                ['label' => 'Grade Ready', 'value' => 0],
            ],
            'diagnostic_reading_profile_distribution' => $this->emptyReadingProfileDistribution(),
            'final_reading_profile_distribution' => $this->emptyReadingProfileDistribution(),
            'recent_learner_activity' => [],
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

    private function emptyReadingProfileDistribution(): array
    {
        return [
            ['label' => 'Low Emerging Reader', 'value' => 0],
            ['label' => 'High Emerging Reader', 'value' => 0],
            ['label' => 'Developing Reader', 'value' => 0],
            ['label' => 'Transitioning Reader', 'value' => 0],
            ['label' => 'Reading at Grade Level', 'value' => 0],
        ];
    }
}
