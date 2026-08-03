<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonRun;
use Illuminate\Support\Collection;

final class LearnerReadingPathService
{
    private const REQUIRED_LESSONS = [
        1 => 'required-lesson-1',
        2 => 'required-lesson-2',
        3 => 'required-lesson-3',
        4 => 'required-lesson-4',
        5 => 'required-lesson-5',
        6 => 'required-lesson-6',
    ];

    /**
     * @return array{
     *     diagnostic: array{status: 'required'|'in_progress'|'completed'|'skipped', score: int|null},
     *     lessons: list<array{order: int, status: 'not_started'|'in_progress'|'completed'}>,
     *     completed_lesson_count: int,
     *     final_assessment: array{status: 'locked'|'available'|'in_progress'|'completed'}
     * }
     */
    public function snapshot(
        Learner $learner,
        ?LearnerProgressState $progress = null,
    ): array {
        $progress ??= $learner->progressState;
        $assessmentRuns = AssessmentRun::query()
            ->where('learner_id', $learner->id)
            ->whereIn('assessment_type', [
                AssessmentRun::TYPE_DIAGNOSTIC,
                AssessmentRun::TYPE_FINAL,
            ])
            ->latest('updated_at')
            ->get();
        $lessonRuns = LessonRun::query()
            ->where('learner_id', $learner->id)
            ->whereIn('lesson_key', array_values(self::REQUIRED_LESSONS))
            ->get();

        return $this->snapshotFromRuns($progress, $assessmentRuns, $lessonRuns);
    }

    /**
     * @param  Collection<int, Learner>  $learners
     * @return Collection<int, array<string, mixed>>
     */
    public function snapshots(Collection $learners): Collection
    {
        $learnerIds = $learners->pluck('id');
        $progressByLearner = $learnerIds->isEmpty()
            ? collect()
            : LearnerProgressState::query()
                ->whereIn('learner_id', $learnerIds)
                ->get()
                ->keyBy('learner_id');
        $assessmentsByLearner = $learnerIds->isEmpty()
            ? collect()
            : AssessmentRun::query()
                ->whereIn('learner_id', $learnerIds)
                ->whereIn('assessment_type', [
                    AssessmentRun::TYPE_DIAGNOSTIC,
                    AssessmentRun::TYPE_FINAL,
                ])
                ->latest('updated_at')
                ->get()
                ->groupBy('learner_id');
        $lessonsByLearner = $learnerIds->isEmpty()
            ? collect()
            : LessonRun::query()
                ->whereIn('learner_id', $learnerIds)
                ->whereIn('lesson_key', array_values(self::REQUIRED_LESSONS))
                ->get()
                ->groupBy('learner_id');

        return $learners->mapWithKeys(fn (Learner $learner): array => [
            $learner->id => $this->snapshotFromRuns(
                $progressByLearner->get($learner->id),
                $assessmentsByLearner->get($learner->id, collect()),
                $lessonsByLearner->get($learner->id, collect()),
            ),
        ]);
    }

    /**
     * @param  Collection<int, AssessmentRun>  $assessmentRuns
     * @param  Collection<int, LessonRun>  $lessonRuns
     * @return array<string, mixed>
     */
    private function snapshotFromRuns(
        ?LearnerProgressState $progress,
        Collection $assessmentRuns,
        Collection $lessonRuns,
    ): array {
        $lessonRuns = $lessonRuns->groupBy('lesson_key');

        $diagnosticRuns = $assessmentRuns
            ->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC);
        $completedDiagnostic = $diagnosticRuns
            ->firstWhere('status', AssessmentRun::STATUS_COMPLETED);
        $diagnosticIsComplete = $progress?->diagnostic_completed_at !== null
            || $completedDiagnostic !== null;
        $diagnosticWasSkipped = $completedDiagnostic?->completion_mode
            === AssessmentRun::COMPLETION_MODE_SKIPPED;
        $diagnosticIsActive = $diagnosticRuns
            ->contains(fn (AssessmentRun $run): bool => $run->status === AssessmentRun::STATUS_ACTIVE);

        $lessons = collect(self::REQUIRED_LESSONS)
            ->map(function (string $lessonKey, int $order) use ($lessonRuns): array {
                /** @var Collection<int, LessonRun> $runs */
                $runs = $lessonRuns->get($lessonKey, collect());

                if ($runs->contains(
                    fn (LessonRun $run): bool => $run->status === LessonRun::STATUS_COMPLETED,
                )) {
                    $status = 'completed';
                } elseif ($runs->contains(
                    fn (LessonRun $run): bool => in_array(
                        $run->status,
                        [LessonRun::STATUS_ACTIVE, LessonRun::STATUS_REVIEW],
                        true,
                    ),
                )) {
                    $status = 'in_progress';
                } else {
                    $status = 'not_started';
                }

                return ['order' => $order, 'status' => $status];
            })
            ->values();
        $completedLessonCount = $lessons->where('status', 'completed')->count();

        $finalRuns = $assessmentRuns
            ->where('assessment_type', AssessmentRun::TYPE_FINAL);
        $finalIsComplete = $progress?->final_assessment_completed_at !== null
            || $finalRuns->contains(
                fn (AssessmentRun $run): bool => $run->status === AssessmentRun::STATUS_COMPLETED,
            );
        $finalIsActive = $finalRuns->contains(
            fn (AssessmentRun $run): bool => $run->status === AssessmentRun::STATUS_ACTIVE,
        );

        $finalStatus = match (true) {
            $finalIsComplete => 'completed',
            $finalIsActive => 'in_progress',
            $completedLessonCount === count(self::REQUIRED_LESSONS) => 'available',
            default => 'locked',
        };

        return [
            'diagnostic' => [
                'status' => match (true) {
                    $diagnosticWasSkipped => 'skipped',
                    $diagnosticIsComplete => 'completed',
                    $diagnosticIsActive => 'in_progress',
                    default => 'required',
                },
                'score' => $diagnosticIsComplete
                    ? $completedDiagnostic?->final_reading_score
                    : null,
            ],
            'lessons' => $lessons->all(),
            'completed_lesson_count' => $completedLessonCount,
            'final_assessment' => ['status' => $finalStatus],
        ];
    }
}
