<?php

namespace App\Services;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use Illuminate\Support\Facades\DB;

final class LearnerDiagnosticSkipService
{
    public function __construct(
        private readonly AssessmentContentCatalog $contentCatalog,
        private readonly LearnerAssessmentCompletionService $completion,
    ) {}

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

            $snapshot = $this->contentCatalog->assessmentSnapshot();
            $completedRun = AssessmentRun::query()
                ->where('learner_id', $learner->id)
                ->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
                ->where('status', AssessmentRun::STATUS_COMPLETED)
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if ($completedRun !== null) {
                if ($this->isZeroScoreDiagnostic($completedRun, $snapshot)) {
                    return $completedRun;
                }

                abort(409, 'The Diagnostic Assessment has already been completed.');
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
                'stage' => 'orientation',
                'current_item_index' => 0,
                'content_snapshot' => $snapshot,
            ]);

            // A whole-diagnostic skip follows the normal low path: every
            // administered item is incorrect, while Task 2B is not administered.
            AssessmentResponse::query()
                ->where('assessment_run_id', $run->id)
                ->delete();

            $run->forceFill([
                'content_snapshot' => $snapshot,
                'stage' => 'assessment-complete',
                'current_item_index' => 0,
                'part_one_branch' => 'low',
                'task_1a_score' => 0,
                'task_2a_score' => 0,
                'task_2b_score' => 0,
                'part_one_score' => 0,
                'part_one_level' => 'Full Refresher',
                'passage_incorrect_words' => 50,
                'reading_accuracy_percent' => 0,
                'comprehension_score' => 0,
                'comprehension_percent' => 0,
                'final_reading_score' => 0,
                'final_reading_profile' => 'Low Emerging Reader',
                'part_one_completed_at' => now(),
            ])->save();

            $this->recordZeroScoreResponses($run, $snapshot);

            return $this->completion->complete($run);
        });
    }

    /** @param array<string, list<array<string, string>>> $snapshot */
    private function recordZeroScoreResponses(AssessmentRun $run, array $snapshot): void
    {
        foreach ($snapshot['task-1a'] as $item) {
            AssessmentResponse::query()->create([
                'assessment_run_id' => $run->id,
                'task_key' => 'task-1a',
                'item_key' => $item['item_key'],
                'item_order' => (int) $item['sort_order'],
                'response_type' => 'speech',
                'raw_transcript' => '',
                'scoring_transcript' => 'NO_RESPONSE',
                'decision' => 'INCORRECT',
                'score' => 0,
                'evidence' => [
                    'diagnostic_skip' => true,
                    'response_committed' => true,
                ],
            ]);
        }

        foreach ($snapshot['task-2a'] as $item) {
            AssessmentResponse::query()->create([
                'assessment_run_id' => $run->id,
                'task_key' => 'task-2a',
                'item_key' => $item['item_key'],
                'item_order' => (int) $item['sort_order'],
                'response_type' => 'choice',
                'selected_response' => $item['correct_response'] === 'yes' ? 'no' : 'yes',
                'decision' => 'INCORRECT',
                'score' => 0,
                'evidence' => [
                    'diagnostic_skip' => true,
                    'response_committed' => true,
                ],
            ]);
        }
    }

    /** @param array<string, list<array<string, string>>> $snapshot */
    private function isZeroScoreDiagnostic(AssessmentRun $run, array $snapshot): bool
    {
        $expectedResponses = count($snapshot['task-1a']) + count($snapshot['task-2a']);
        $responses = $run->responses()->get();

        return $run->completion_mode === AssessmentRun::COMPLETION_MODE_STANDARD
            && $run->part_one_branch === 'low'
            && $run->task_1a_score === 0
            && $run->task_2a_score === 0
            && $run->task_2b_score === 0
            && $run->part_one_score === 0
            && $run->final_reading_score === 0
            && $responses->count() === $expectedResponses
            && $responses->every(fn (AssessmentResponse $response): bool => $response->decision === 'INCORRECT'
                && $response->score === 0
                && data_get($response->evidence, 'diagnostic_skip') === true);
    }
}
