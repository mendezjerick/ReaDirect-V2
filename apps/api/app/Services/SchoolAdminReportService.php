<?php

namespace App\Services;

use App\Models\StaffUser;

final class SchoolAdminReportService
{
    public function __construct(
        private readonly TeacherReportService $teacherReports,
    ) {}

    /** @return array<string, mixed> */
    public function build(StaffUser $administrator): array
    {
        $administrator->loadMissing('school:id,name');
        $teachers = StaffUser::query()
            ->with('school:id,name')
            ->where('role', 'teacher')
            ->where('school_id', $administrator->school_id)
            ->orderBy('grade_level')
            ->orderBy('section')
            ->orderBy('id')
            ->get();
        $classes = $teachers->map(function (StaffUser $teacher): array {
            $report = $this->teacherReports->build($teacher);

            return [
                'teacher' => [
                    'id' => $teacher->id,
                    'name' => $teacher->display_name,
                    'username' => $teacher->username,
                ],
                'grade_level' => $teacher->grade_level,
                'section' => $teacher->section,
                'summary' => $report['summary'],
                'learners' => collect($report['learners'])
                    ->map(fn (array $learner): array => [
                        ...$learner,
                        'teacher' => [
                            'id' => $teacher->id,
                            'name' => $teacher->display_name,
                            'username' => $teacher->username,
                        ],
                        'grade_level' => $teacher->grade_level,
                        'section' => $teacher->section,
                    ])
                    ->all(),
            ];
        });
        $learners = $classes
            ->flatMap(fn (array $class): array => $class['learners'])
            ->sortBy('learner_name')
            ->values();

        return [
            'school' => [
                'id' => $administrator->school?->id,
                'name' => $administrator->school?->name,
            ],
            'generated_at' => now()->toIso8601String(),
            'summary' => [
                'teachers' => $teachers->count(),
                'classes' => $teachers->count(),
                'learners' => $learners->count(),
                'diagnostic_complete' => $learners
                    ->where('diagnostic.status', 'completed')->count(),
                'all_lessons_complete' => $learners
                    ->where('required_lessons_completed', 6)->count(),
                'final_complete' => $learners
                    ->where('final.status', 'completed')->count(),
                'with_review_evidence' => $learners
                    ->where('has_review_evidence', true)->count(),
            ],
            'classes' => $classes->all(),
            'learners' => $learners->all(),
        ];
    }
}
