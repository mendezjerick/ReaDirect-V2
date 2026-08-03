<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\LearnerAchievement;
use App\Models\LearnerProgressState;
use Illuminate\Support\Facades\DB;

final class LearnerAssessmentCompletionService
{
    public function complete(AssessmentRun $assessmentRun): AssessmentRun
    {
        return DB::transaction(function () use ($assessmentRun): AssessmentRun {
            $run = AssessmentRun::query()
                ->lockForUpdate()
                ->findOrFail($assessmentRun->id);

            abort_unless(
                $run->stage === 'assessment-complete',
                409,
                'The assessment is not ready to finish.',
            );

            if ($run->status === AssessmentRun::STATUS_COMPLETED) {
                return $run;
            }

            $completedAt = now();
            $isFinal = $run->assessment_type === AssessmentRun::TYPE_FINAL;
            $progress = LearnerProgressState::query()->firstOrNew([
                'learner_id' => $run->learner_id,
            ]);
            $progress->forceFill([
                'stage' => $isFinal
                    ? LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE
                    : 'required_lessons',
                'current_required_lesson_order' => $isFinal ? null : 1,
                $isFinal
                    ? 'final_assessment_completed_at'
                    : 'diagnostic_completed_at' => $completedAt,
                'last_confirmed_at' => $completedAt,
            ])->save();

            $run->forceFill([
                'status' => AssessmentRun::STATUS_COMPLETED,
                'completion_mode' => AssessmentRun::COMPLETION_MODE_STANDARD,
                'assessment_completed_at' => $completedAt,
                'skipped_at' => null,
            ])->save();

            LearnerAchievement::query()->firstOrCreate(
                [
                    'learner_id' => $run->learner_id,
                    'achievement_key' => $isFinal
                        ? 'reading.readirect_champion'
                        : 'reading.ready_reader',
                ],
                [
                    'awarded_at' => $completedAt,
                    'evidence' => ['assessment_run_id' => $run->id],
                ],
            );

            return $run->fresh();
        });
    }
}
