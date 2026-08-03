<?php

namespace App\Services;

use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerProgressState;
use App\Models\LessonRun;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class LearnerLessonCompletionService
{
    public const REQUIRED_LESSONS = [
        1 => 'required-lesson-1',
        2 => 'required-lesson-2',
        3 => 'required-lesson-3',
        4 => 'required-lesson-4',
        5 => 'required-lesson-5',
        6 => 'required-lesson-6',
    ];

    /**
     * @return array{run: LessonRun, completed_lesson_count: int, final_assessment_ready: bool}
     */
    public function complete(
        LessonRun $lessonRun,
        string $achievementKey,
    ): array {
        return DB::transaction(function () use (
            $lessonRun,
            $achievementKey,
        ): array {
            $run = LessonRun::query()
                ->lockForUpdate()
                ->findOrFail($lessonRun->id);
            abort_unless(
                in_array($run->lesson_key, self::REQUIRED_LESSONS, true),
                409,
                'Only required reading lessons can be completed here.',
            );

            Learner::query()->lockForUpdate()->findOrFail($run->learner_id);
            $completedAt = $run->completed_at ?? now();
            if ($run->status !== LessonRun::STATUS_COMPLETED) {
                $run->forceFill([
                    'status' => LessonRun::STATUS_COMPLETED,
                    'completed_at' => $completedAt,
                ])->save();
            }

            LearnerAchievement::query()->firstOrCreate(
                [
                    'learner_id' => $run->learner_id,
                    'achievement_key' => $achievementKey,
                ],
                [
                    'awarded_at' => $completedAt,
                    'evidence' => ['lesson_run_id' => $run->id],
                ],
            );

            $completedKeys = LessonRun::query()
                ->where('learner_id', $run->learner_id)
                ->whereIn('lesson_key', self::REQUIRED_LESSONS)
                ->where('status', LessonRun::STATUS_COMPLETED)
                ->distinct()
                ->pluck('lesson_key');
            $completedCount = $completedKeys->count();
            $finalAssessmentReady = $completedCount === count(self::REQUIRED_LESSONS);
            $progress = LearnerProgressState::query()
                ->lockForUpdate()
                ->firstOrNew(['learner_id' => $run->learner_id]);
            $journeyAlreadyComplete = $progress->stage
                === LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE;
            $completedOrder = array_search(
                $run->lesson_key,
                self::REQUIRED_LESSONS,
                true,
            );
            $legacyCursor = (int) $progress->current_required_lesson_order;
            $nextIncompleteOrder = collect(self::REQUIRED_LESSONS)
                ->keys()
                ->first(
                    fn (int $order): bool => $order > $completedOrder
                        && ! $completedKeys->contains(self::REQUIRED_LESSONS[$order]),
                ) ?? collect(self::REQUIRED_LESSONS)
                ->keys()
                ->first(
                    fn (int $order): bool => ! $completedKeys->contains(
                        self::REQUIRED_LESSONS[$order],
                    ),
                );
            $compatibilityCursor = $legacyCursor === $completedOrder
                ? $nextIncompleteOrder
                : ($legacyCursor > 0 ? $legacyCursor : $nextIncompleteOrder);
            $progress->forceFill([
                'stage' => $journeyAlreadyComplete
                    ? LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE
                    : ($finalAssessmentReady
                        ? LearnerProgressState::FINAL_ASSESSMENT_STAGE
                        : LearnerProgressState::REQUIRED_LESSONS_STAGE),
                'current_required_lesson_order' => $finalAssessmentReady
                    ? null
                    : $compatibilityCursor,
                'last_confirmed_at' => $completedAt,
            ])->save();

            return [
                'run' => $run->fresh(),
                'completed_lesson_count' => $completedCount,
                'final_assessment_ready' => $finalAssessmentReady,
            ];
        });
    }

    public function completedLessonCount(int $learnerId): int
    {
        return $this->completedLessonKeys($learnerId)->count();
    }

    /** @return Collection<int, string> */
    private function completedLessonKeys(int $learnerId): Collection
    {
        return LessonRun::query()
            ->where('learner_id', $learnerId)
            ->whereIn('lesson_key', self::REQUIRED_LESSONS)
            ->where('status', LessonRun::STATUS_COMPLETED)
            ->distinct()
            ->pluck('lesson_key');
    }

    /**
     * @param  array<string, mixed>  $lessonResult
     * @return array<string, mixed>
     */
    public function completionPayload(
        LessonRun $run,
        array $lessonResult,
    ): array {
        $completedKeys = $this->completedLessonKeys($run->learner_id);
        $completedCount = $completedKeys->count();
        $finalAssessmentReady = $completedCount === count(self::REQUIRED_LESSONS);

        return [
            ...$lessonResult,
            ...($finalAssessmentReady ? [
                'title' => 'You finished all six reading lessons.',
                'message' => 'Your Final Assessment is now ready.',
            ] : [
                'message' => "{$completedCount} of 6 reading lessons complete.",
            ]),
            'completed_lesson_count' => $completedCount,
            'final_assessment_ready' => $finalAssessmentReady,
            'lessons' => collect(self::REQUIRED_LESSONS)
                ->map(fn (string $lessonKey, int $order): array => [
                    'lesson' => $order,
                    'complete' => $completedKeys->contains($lessonKey),
                ])
                ->values()
                ->all(),
        ];
    }
}
