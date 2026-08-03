<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerProgressState;
use Illuminate\Support\Facades\DB;

final class LearnerDiagnosticSkipService
{
    public function skip(Learner $learner): AssessmentRun
    {
        return DB::transaction(function () use ($learner): AssessmentRun {
            $learner = Learner::query()
                ->lockForUpdate()
                ->findOrFail($learner->id);

            abort_unless(
                $learner->account_purpose === Learner::PURPOSE_STANDARD,
                409,
                'This Learner account cannot skip the Diagnostic Assessment.',
            );

            $progress = LearnerProgressState::query()
                ->where('learner_id', $learner->id)
                ->lockForUpdate()
                ->first();
            $progress ??= new LearnerProgressState([
                'learner_id' => $learner->id,
                'stage' => LearnerProgressState::BASELINE_STAGE,
            ]);

            abort_if(
                $progress->final_assessment_completed_at !== null
                    || in_array($progress->stage, [
                        LearnerProgressState::FINAL_ASSESSMENT_STAGE,
                        LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
                    ], true),
                409,
                'The Diagnostic Assessment cannot be skipped after the Final Assessment is available.',
            );

            $completedRun = AssessmentRun::query()
                ->where('learner_id', $learner->id)
                ->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
                ->where('status', AssessmentRun::STATUS_COMPLETED)
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if ($completedRun !== null) {
                abort_unless(
                    $completedRun->completion_mode === AssessmentRun::COMPLETION_MODE_SKIPPED,
                    409,
                    'The Diagnostic Assessment has already been completed.',
                );

                return $completedRun;
            }

            abort_if(
                $progress->diagnostic_completed_at !== null,
                409,
                'The Diagnostic Assessment has already been completed.',
            );

            $run = AssessmentRun::query()
                ->where('learner_id', $learner->id)
                ->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
                ->where('status', AssessmentRun::STATUS_ACTIVE)
                ->lockForUpdate()
                ->latest('id')
                ->first();
            $run ??= AssessmentRun::query()->create([
                'learner_id' => $learner->id,
                'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
                'content_version' => 'v1',
                'status' => AssessmentRun::STATUS_ACTIVE,
                'completion_mode' => AssessmentRun::COMPLETION_MODE_STANDARD,
                'stage' => 'orientation',
                'current_item_index' => 0,
                'content_snapshot' => [],
            ]);

            $skippedAt = now();
            $run->forceFill([
                'status' => AssessmentRun::STATUS_COMPLETED,
                'completion_mode' => AssessmentRun::COMPLETION_MODE_SKIPPED,
                'stage' => 'assessment-complete',
                'current_item_index' => 0,
                'task_1a_score' => 0,
                'task_2a_score' => 0,
                'task_2b_score' => 0,
                'part_one_score' => 0,
                'part_one_level' => 'Full Refresher',
                'passage_incorrect_words' => 0,
                'reading_accuracy_percent' => 0,
                'comprehension_score' => 0,
                'comprehension_percent' => 0,
                'final_reading_score' => 0,
                'final_reading_profile' => 'Low Emerging Reader',
                'assessment_completed_at' => $skippedAt,
                'skipped_at' => $skippedAt,
            ])->save();

            $progress->forceFill([
                'stage' => 'required_lessons',
                'current_required_lesson_order' => 1,
                'diagnostic_completed_at' => $skippedAt,
                'last_confirmed_at' => $skippedAt,
            ])->save();

            LearnerAchievement::query()->firstOrCreate(
                [
                    'learner_id' => $learner->id,
                    'achievement_key' => 'reading.ready_reader',
                ],
                [
                    'awarded_at' => $skippedAt,
                    'evidence' => [
                        'assessment_run_id' => $run->id,
                        'completion_mode' => AssessmentRun::COMPLETION_MODE_SKIPPED,
                    ],
                ],
            );

            return $run->fresh();
        });
    }
}
