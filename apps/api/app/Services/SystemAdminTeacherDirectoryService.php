<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Learner;
use App\Models\StaffUser;
use Illuminate\Database\Eloquent\Builder;

final class SystemAdminTeacherDirectoryService
{
    public function build(): array
    {
        $teachers = StaffUser::query()
            ->where('role', 'teacher')
            ->with('school:id,name')
            ->withCount([
                'learners as standard_learners_count' => fn (Builder $query): Builder => $query
                    ->where('account_purpose', Learner::PURPOSE_STANDARD),
                'learners as active_standard_learners_count' => fn (Builder $query): Builder => $query
                    ->where('account_purpose', Learner::PURPOSE_STANDARD)
                    ->where('is_active', true),
            ])
            ->get()
            ->sortBy(fn (StaffUser $teacher): string => implode('|', [
                $teacher->school_id === null ? '1' : '0',
                mb_strtolower($teacher->school?->name ?? ''),
                mb_strtolower($teacher->username ?? ''),
            ]))
            ->values()
            ->map(function (StaffUser $teacher): array {
                $assignmentComplete = $teacher->school_id !== null
                    && $teacher->grade_level !== null
                    && is_string($teacher->section)
                    && trim($teacher->section) !== '';

                return [
                    'id' => $teacher->id,
                    'username' => $teacher->username,
                    'display_name' => $teacher->display_name,
                    'is_active' => $teacher->is_active,
                    'school' => $teacher->school === null
                        ? null
                        : [
                            'id' => $teacher->school->id,
                            'name' => $teacher->school->name,
                        ],
                    'grade_level' => $teacher->grade_level,
                    'section' => $teacher->section,
                    'assignment_complete' => $assignmentComplete,
                    'requires_assignment_acknowledgement' => $assignmentComplete
                        && $teacher->teacher_assignment_acknowledged_at === null,
                    'requires_credential_setup' => $teacher->requires_credential_setup,
                    'learners' => [
                        'total' => (int) $teacher->getAttribute('standard_learners_count'),
                        'active' => (int) $teacher->getAttribute('active_standard_learners_count'),
                    ],
                    'created_at' => $teacher->created_at?->toIso8601String(),
                ];
            });

        return [
            'summary' => [
                'total_teachers' => $teachers->count(),
                'active_teachers' => $teachers->where('is_active', true)->count(),
                'active_standard_learners' => $teachers->sum(
                    fn (array $teacher): int => $teacher['learners']['active'],
                ),
                'pending_assignment_acknowledgements' => $teachers
                    ->where('requires_assignment_acknowledgement', true)
                    ->count(),
                'incomplete_assignments' => $teachers
                    ->where('assignment_complete', false)
                    ->count(),
                'schools_represented' => $teachers
                    ->pluck('school.id')
                    ->filter()
                    ->unique()
                    ->count(),
            ],
            'teachers' => $teachers,
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
