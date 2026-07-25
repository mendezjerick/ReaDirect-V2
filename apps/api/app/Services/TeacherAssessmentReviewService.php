<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\StaffUser;
use InvalidArgumentException;

final class TeacherAssessmentReviewService
{
    /** @return array<string, mixed> */
    public function build(StaffUser $teacher, string $assessmentType): array
    {
        if (! in_array($assessmentType, [
            AssessmentRun::TYPE_DIAGNOSTIC,
            AssessmentRun::TYPE_FINAL,
        ], true)) {
            throw new InvalidArgumentException('Unsupported assessment review type.');
        }

        $learners = Learner::query()
            ->with('progressState')
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->where('teacher_id', $teacher->id)
            ->get();
        $learnerIds = $learners->pluck('id');

        $latestRuns = $learnerIds->isEmpty()
            ? collect()
            : AssessmentRun::query()
                ->withCount([
                    'responses as skipped_items_count' => fn ($query) => $query
                        ->where('response_type', 'skipped'),
                ])
                ->whereIn('learner_id', $learnerIds)
                ->where('assessment_type', $assessmentType)
                ->latest('id')
                ->get()
                ->unique('learner_id')
                ->keyBy('learner_id');

        $rows = $learners
            ->map(function (Learner $learner) use (
                $assessmentType,
                $latestRuns,
            ): array {
                $run = $latestRuns->get($learner->id);
                $status = match (true) {
                    $run instanceof AssessmentRun
                        && $run->status === AssessmentRun::STATUS_COMPLETED => 'completed',
                    $run instanceof AssessmentRun => 'in_progress',
                    $assessmentType === AssessmentRun::TYPE_DIAGNOSTIC => 'pending',
                    $learner->progressState?->stage
                        === LearnerProgressState::FINAL_ASSESSMENT_STAGE => 'ready',
                    default => 'not_ready',
                };

                return [
                    'learner' => [
                        'id' => $learner->id,
                        'learner_code' => $learner->learner_code,
                        'full_name' => $this->fullName($learner),
                    ],
                    'status' => $status,
                    'part_one_score' => $run?->part_one_score,
                    'part_one_level' => $run?->part_one_level,
                    'reading_accuracy_percent' => $run?->reading_accuracy_percent,
                    'comprehension_score' => $run?->comprehension_score,
                    'comprehension_percent' => $run?->comprehension_percent,
                    'final_reading_score' => $run?->final_reading_score,
                    'final_reading_profile' => $run?->final_reading_profile,
                    'skipped_items_count' => (int) ($run?->skipped_items_count ?? 0),
                    'completed_at' => $run?->assessment_completed_at?->toIso8601String(),
                    'last_activity_at' => ($run?->assessment_completed_at ?? $run?->updated_at)
                        ?->toIso8601String(),
                ];
            })
            ->sortBy(fn (array $row): string => mb_strtolower($row['learner']['full_name']))
            ->values();

        return [
            'assessment_type' => $assessmentType,
            'metrics' => [
                'total_learners' => $rows->count(),
                'pending' => $rows->where('status', 'pending')->count(),
                'not_ready' => $rows->where('status', 'not_ready')->count(),
                'ready' => $rows->where('status', 'ready')->count(),
                'in_progress' => $rows->where('status', 'in_progress')->count(),
                'completed' => $rows->where('status', 'completed')->count(),
                'with_skipped_items' => $rows
                    ->filter(fn (array $row): bool => $row['skipped_items_count'] > 0)
                    ->count(),
            ],
            'learners' => $rows->all(),
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
