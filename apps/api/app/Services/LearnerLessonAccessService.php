<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonRun;
use Closure;
use Illuminate\Support\Facades\DB;

final class LearnerLessonAccessService
{
    private const REQUIRED_LESSON_KEYS = [
        'required-lesson-1',
        'required-lesson-2',
        'required-lesson-3',
        'required-lesson-4',
        'required-lesson-5',
        'required-lesson-6',
    ];

    /** @param Closure(): array<string, mixed> $contentSnapshot */
    public function startOrResume(
        Learner $learner,
        string $lessonKey,
        Closure $contentSnapshot,
    ): LessonRun {
        abort_unless(in_array($lessonKey, self::REQUIRED_LESSON_KEYS, true), 404);

        return DB::transaction(function () use (
            $learner,
            $lessonKey,
            $contentSnapshot,
        ): LessonRun {
            $learner = Learner::query()
                ->lockForUpdate()
                ->findOrFail($learner->id);
            $this->authorize($learner);

            $completedRun = LessonRun::query()
                ->where('learner_id', $learner->id)
                ->where('lesson_key', $lessonKey)
                ->where('status', LessonRun::STATUS_COMPLETED)
                ->latest('completed_at')
                ->latest('id')
                ->first();
            if ($completedRun !== null) {
                return $completedRun;
            }

            $resumableRun = LessonRun::query()
                ->where('learner_id', $learner->id)
                ->where('lesson_key', $lessonKey)
                ->whereIn('status', [
                    LessonRun::STATUS_ACTIVE,
                    LessonRun::STATUS_REVIEW,
                ])
                ->latest('id')
                ->first();
            if ($resumableRun !== null) {
                return $resumableRun;
            }

            return LessonRun::query()->create([
                'learner_id' => $learner->id,
                'lesson_key' => $lessonKey,
                'content_version' => 'v1',
                'status' => LessonRun::STATUS_ACTIVE,
                'mission_key' => 'mission-1',
                'current_item_index' => 0,
                'content_snapshot' => $contentSnapshot(),
            ]);
        });
    }

    public function authorize(Learner $learner): void
    {
        abort_unless(
            $this->hasPassedDiagnosticGate($learner),
            409,
            'Complete or skip the Diagnostic Assessment before starting lessons.',
        );
    }

    public function hasPassedDiagnosticGate(Learner $learner): bool
    {
        $progress = LearnerProgressState::query()
            ->where('learner_id', $learner->id)
            ->first();
        $completedDiagnosticExists = AssessmentRun::query()
            ->where('learner_id', $learner->id)
            ->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
            ->where('status', AssessmentRun::STATUS_COMPLETED)
            ->exists();

        return $progress?->diagnostic_completed_at !== null
            || in_array($progress?->stage, [
                LearnerProgressState::REQUIRED_LESSONS_STAGE,
                LearnerProgressState::FINAL_ASSESSMENT_STAGE,
                LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
            ], true)
            || $completedDiagnosticExists;
    }
}
