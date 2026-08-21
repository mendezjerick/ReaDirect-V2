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
                in_array($learner->account_purpose, [
                    Learner::PURPOSE_STANDARD,
                    Learner::PURPOSE_PORTAL_SYSTEM,
                ], true),
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
                if ($this->wasCompletedByDiagnosticSkip($completedRun)) {
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

            // Keep every committed response and treat only the remaining
            // applicable items as incorrect.
            $this->recordRemainingZeroScoreResponses($run, $snapshot, 'task-1a');
            $taskOneScore = $this->taskScore($run, 'task-1a');
            $partOneBranch = $taskOneScore <= 6 ? 'low' : 'high';

            if ($partOneBranch === 'low') {
                $this->recordRemainingZeroScoreResponses($run, $snapshot, 'task-2a');
                $taskTwoAScore = $this->taskScore($run, 'task-2a');
                $taskTwoBScore = 0;
            } else {
                $this->recordRemainingZeroScoreResponses($run, $snapshot, 'task-2b');
                $taskTwoAScore = 10;
                $taskTwoBScore = $this->taskScore($run, 'task-2b');
            }

            $partOneScore = $taskOneScore + $taskTwoAScore + $taskTwoBScore;
            [$readingAccuracy, $incorrectWords, $comprehensionScore] =
                $this->partTwoScores($run, $snapshot);
            $comprehensionPercent = $comprehensionScore * 20;
            $finalScore = (int) round(
                ($comprehensionPercent * 0.60) + ($readingAccuracy * 0.40),
            );

            $run->forceFill([
                'content_snapshot' => $snapshot,
                'stage' => 'assessment-complete',
                'current_item_index' => 0,
                'part_one_branch' => $partOneBranch,
                'task_1a_score' => $taskOneScore,
                'task_2a_score' => $taskTwoAScore,
                'task_2b_score' => $taskTwoBScore,
                'part_one_score' => $partOneScore,
                'part_one_level' => $this->partOneLevel($partOneScore),
                'passage_incorrect_words' => $incorrectWords,
                'reading_accuracy_percent' => $readingAccuracy,
                'comprehension_score' => $comprehensionScore,
                'comprehension_percent' => $comprehensionPercent,
                'final_reading_score' => $finalScore,
                'final_reading_profile' => $this->readingProfile($finalScore),
                'part_one_completed_at' => now(),
                'part_two_completed_at' => now(),
            ])->save();

            return $this->completion->complete($run);
        });
    }

    /** @param array<string, list<array<string, string>>> $snapshot */
    private function recordRemainingZeroScoreResponses(
        AssessmentRun $run,
        array $snapshot,
        string $taskKey,
    ): void {
        foreach ($snapshot[$taskKey] ?? [] as $item) {
            AssessmentResponse::query()->firstOrCreate(
                [
                    'assessment_run_id' => $run->id,
                    'task_key' => $taskKey,
                    'item_key' => $item['item_key'],
                ],
                [
                    'item_order' => (int) $item['sort_order'],
                    'response_type' => $taskKey === 'task-2a' ? 'choice' : 'speech',
                    'raw_transcript' => $taskKey === 'task-2a' ? null : '',
                    'scoring_transcript' => $taskKey === 'task-2a' ? null : 'NO_RESPONSE',
                    'selected_response' => $taskKey === 'task-2a'
                        ? ($item['correct_response'] === 'yes' ? 'no' : 'yes')
                        : null,
                    'decision' => 'INCORRECT',
                    'score' => 0,
                    'evidence' => [
                        'diagnostic_skip' => true,
                        'diagnostic_skip_remaining' => true,
                        'response_committed' => true,
                    ],
                ],
            );
        }
    }

    private function taskScore(AssessmentRun $run, string $taskKey): int
    {
        return (int) AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('task_key', $taskKey)
            ->sum('score');
    }

    /**
     * @param  array<string, list<array<string, string>>>  $snapshot
     * @return array{int, int, int}
     */
    private function partTwoScores(AssessmentRun $run, array $snapshot): array
    {
        if ($run->selected_story_key === null) {
            return [0, 50, 0];
        }

        $passage = collect($snapshot['task-3a'] ?? [])
            ->first(fn (array $item): bool => $item['story_key'] === $run->selected_story_key);
        if ($passage !== null) {
            $this->recordPartTwoZeroResponse($run, 'task-3a', $passage, 'speech');
        }

        $questions = collect($snapshot['task-3b'] ?? [])
            ->filter(fn (array $item): bool => $item['story_key'] === $run->selected_story_key)
            ->values();
        foreach ($questions as $question) {
            $this->recordPartTwoZeroResponse($run, 'task-3b', $question, 'choice');
        }

        $passageResponse = $passage === null
            ? null
            : AssessmentResponse::query()
                ->where('assessment_run_id', $run->id)
                ->where('task_key', 'task-3a')
                ->where('item_key', $passage['item_key'])
                ->first();

        return [
            (int) ($passageResponse?->score ?? 0),
            (int) data_get($passageResponse?->evidence, 'scoring.incorrect_words', 50),
            $this->taskScore($run, 'task-3b'),
        ];
    }

    /** @param array<string, string> $item */
    private function recordPartTwoZeroResponse(
        AssessmentRun $run,
        string $taskKey,
        array $item,
        string $responseType,
    ): void {
        AssessmentResponse::query()->firstOrCreate(
            [
                'assessment_run_id' => $run->id,
                'task_key' => $taskKey,
                'item_key' => $item['item_key'],
            ],
            [
                'item_order' => (int) ($item['story_question_order']
                    ?? $item['sort_order']
                    ?? $item['choice_order']
                    ?? 1),
                'response_type' => $responseType,
                'raw_transcript' => $responseType === 'speech' ? '' : null,
                'scoring_transcript' => $responseType === 'speech' ? 'NO_RESPONSE' : null,
                'selected_response' => null,
                'decision' => 'INCORRECT',
                'score' => 0,
                'evidence' => [
                    'diagnostic_skip' => true,
                    'diagnostic_skip_remaining' => true,
                    'response_committed' => true,
                ],
            ],
        );
    }

    private function partOneLevel(int $score): string
    {
        return match (true) {
            $score <= 10 => 'Full Refresher',
            $score <= 16 => 'Moderate Refresher',
            $score <= 26 => 'Light Refresher',
            default => 'Grade Ready',
        };
    }

    private function readingProfile(int $score): string
    {
        return match (true) {
            $score <= 25 => 'Low Emerging Reader',
            $score <= 50 => 'High Emerging Reader',
            $score <= 75 => 'Developing Reader',
            $score <= 90 => 'Transitioning Reader',
            default => 'Reading at Grade Level',
        };
    }

    private function wasCompletedByDiagnosticSkip(AssessmentRun $run): bool
    {
        if ($run->completion_mode !== AssessmentRun::COMPLETION_MODE_STANDARD) {
            return false;
        }

        return $run->responses()->get()->contains(
            fn (AssessmentResponse $response): bool => data_get($response->evidence, 'diagnostic_skip_remaining') === true
                || data_get($response->evidence, 'diagnostic_skip') === true,
        );
    }
}
