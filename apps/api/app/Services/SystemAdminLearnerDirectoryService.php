<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Learner;
use App\Models\LearnerProgressState;

final class SystemAdminLearnerDirectoryService
{
    public function __construct(
        private readonly LearnerReadingPathService $readingPaths,
    ) {}

    public function build(): array
    {
        $learners = Learner::query()
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->with([
                'school:id,name',
                'teacher:id,username,display_name,is_active',
                'progressState',
            ])
            ->get();
        $readingPaths = $this->readingPaths->snapshots($learners);
        $learners = $learners
            ->sortBy(fn (Learner $learner): string => implode('|', [
                mb_strtolower($learner->school?->name ?? ''),
                mb_strtolower($learner->last_name),
                mb_strtolower($learner->first_name),
                $learner->learner_code,
            ]))
            ->values()
            ->map(function (Learner $learner) use ($readingPaths): array {
                $progress = $learner->progressState;

                return [
                    'id' => $learner->id,
                    'learner_code' => $learner->learner_code,
                    'full_name' => $this->fullName($learner),
                    'is_active' => $learner->is_active,
                    'school' => $learner->school === null
                        ? null
                        : [
                            'id' => $learner->school->id,
                            'name' => $learner->school->name,
                        ],
                    'teacher' => $learner->teacher === null
                        ? null
                        : [
                            'id' => $learner->teacher->id,
                            'username' => $learner->teacher->username,
                            'display_name' => $learner->teacher->display_name,
                            'is_active' => $learner->teacher->is_active,
                        ],
                    'grade_level' => $learner->grade_level,
                    'section' => $learner->section,
                    'progress' => [
                        'stage' => $progress?->stage
                            ?? LearnerProgressState::BASELINE_STAGE,
                        'current_required_lesson_order' => $progress?->current_required_lesson_order,
                        'diagnostic_completed' => $progress?->diagnostic_completed_at !== null,
                        'final_assessment_completed' => $progress?->final_assessment_completed_at !== null,
                        'last_confirmed_at' => $progress?->last_confirmed_at?->toIso8601String(),
                    ],
                    'reading_path' => $readingPaths->get($learner->id),
                    'created_at' => $learner->created_at?->toIso8601String(),
                ];
            });

        return [
            'summary' => [
                'total_learners' => $learners->count(),
                'active_learners' => $learners->where('is_active', true)->count(),
                'diagnostic_completed' => $learners
                    ->where('progress.diagnostic_completed', true)
                    ->count(),
                'final_assessment_completed' => $learners
                    ->where('progress.final_assessment_completed', true)
                    ->count(),
                'without_teacher' => $learners->whereNull('teacher')->count(),
                'schools_represented' => $learners
                    ->pluck('school.id')
                    ->filter()
                    ->unique()
                    ->count(),
            ],
            'learners' => $learners,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function fullName(Learner $learner): string
    {
        return implode(' ', array_filter([
            $learner->first_name,
            $learner->middle_name,
            $learner->last_name,
            $learner->suffix,
        ]));
    }
}
