<?php

namespace App\Http\Controllers;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\LearnerAchievement;
use App\Models\LearnerProgressState;
use App\Services\LearnerAssessmentAsr;
use App\Services\LearnerSessionResolver;
use App\Services\PassageReadingResultService;
use App\Services\SpeechEquivalenceResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use RuntimeException;

final class LearnerAssessmentPartTwoController extends Controller
{
    private const ACTIVE_STAGES = [
        'story-selection',
        'task-3a',
        'task-3b',
        'passage-results',
        'part-2-results',
        'assessment-complete',
    ];

    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
        private readonly LearnerAssessmentAsr $asr,
        private readonly SpeechEquivalenceResolver $equivalenceResolver,
        private readonly PassageReadingResultService $passageResults,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $run = AssessmentRun::query()
            ->where('learner_id', $session->learner_id)
            ->where('assessment_type', 'diagnostic')
            ->where('status', AssessmentRun::STATUS_ACTIVE)
            ->whereIn('stage', self::ACTIVE_STAGES)
            ->latest('id')
            ->first();
        abort_unless($run !== null, 404, 'Part 2 is not available for this assessment.');

        return response()->json($this->serialize($this->resumePastCommittedItem($run)));
    }

    public function selectStory(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        $storyKeys = collect($run->content_snapshot['task-3a'] ?? [])
            ->pluck('story_key')
            ->filter()
            ->values()
            ->all();
        $validated = $request->validate([
            'story_key' => ['required', 'string', Rule::in($storyKeys)],
        ]);

        DB::transaction(function () use ($run, $validated): void {
            $run->refresh();
            abort_unless($run->stage === 'story-selection', 409, 'The story choice is already complete.');
            if ($run->selected_story_key !== null) {
                abort_unless(
                    hash_equals($run->selected_story_key, $validated['story_key']),
                    409,
                    'The confirmed story cannot be changed.',
                );
            }

            $run->forceFill([
                'selected_story_key' => $validated['story_key'],
                'story_selected_at' => $run->story_selected_at ?? now(),
                'stage' => 'task-3a',
                'current_item_index' => 0,
            ])->save();
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function submitPassage(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        abort_unless($run->stage === 'task-3a', 409, 'This is not the passage-reading task.');
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
            'audio' => ['required', 'file', 'max:51200'],
        ]);
        $item = $this->selectedPassage($run);
        abort_unless($item !== null && hash_equals($item['item_key'], $validated['item_key']), 409, 'That passage is no longer active.');

        if ($this->response($run, 'task-3a', $item['item_key'])) {
            $this->advancePastPassage($run);

            return response()->json($this->serialize($run->fresh()));
        }

        /** @var UploadedFile $audio */
        $audio = $validated['audio'];
        try {
            $evidence = $this->asr->passage($audio, $item['spoken_target']);
        } catch (RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 503);
        }

        $rawTranscript = (string) ($evidence['raw_transcript'] ?? '');
        $resolution = $this->equivalenceResolver->resolve(
            $item['spoken_target'],
            $rawTranscript,
            $item['item_key'],
        );
        $evidence['equivalence_resolution'] = $resolution;
        $incorrectWords = min(50, collect($resolution['differences'] ?? [])
            ->filter(fn (array $difference): bool => ($difference['expected'] ?? '') !== ''
                && ! in_array($difference['status'] ?? '', ['match', 'equivalent'], true)
            )->count());
        $accuracy = max(0, 100 - ($incorrectWords * 2));
        $readingMetrics = $this->passageResults->metrics(
            $evidence,
            $resolution,
            $incorrectWords,
        );
        $audioBytes = file_get_contents($audio->getRealPath());
        $sha = hash('sha256', $audioBytes);
        $extension = strtolower($audio->getClientOriginalExtension() ?: 'webm');
        $path = "assessment-audio/{$run->id}/task-3a/{$item['item_key']}-{$sha}.{$extension}";
        Storage::disk('local')->put($path, $audioBytes);

        DB::transaction(function () use (
            $run,
            $item,
            $rawTranscript,
            $resolution,
            $incorrectWords,
            $accuracy,
            $readingMetrics,
            $path,
            $sha,
            $evidence,
        ): void {
            $run->refresh();
            abort_unless($run->stage === 'task-3a', 409, 'The passage response is already complete.');
            if (! $this->response($run, 'task-3a', $item['item_key'])) {
                AssessmentResponse::query()->create([
                    'assessment_run_id' => $run->id,
                    'task_key' => 'task-3a',
                    'item_key' => $item['item_key'],
                    'item_order' => 1,
                    'response_type' => 'speech',
                    'raw_transcript' => $rawTranscript,
                    'scoring_transcript' => $rawTranscript,
                    'decision' => 'COMPLETED',
                    'score' => $accuracy,
                    'audio_path' => $path,
                    'audio_sha256' => $sha,
                    'evidence' => [
                        ...$evidence,
                        'scoring' => [
                            'incorrect_words' => $incorrectWords,
                            'reading_accuracy_percent' => $accuracy,
                            'expected_word_count' => $resolution['expected_word_count'] ?? 50,
                            ...$readingMetrics,
                        ],
                    ],
                ]);
            }
            $run->forceFill([
                'passage_incorrect_words' => $incorrectWords,
                'reading_accuracy_percent' => $accuracy,
                'stage' => 'task-3b',
                'current_item_index' => 0,
            ])->save();
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function submitComprehension(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
            'choice' => ['required', Rule::in(['a', 'b', 'c', 'd'])],
        ]);

        DB::transaction(function () use ($run, $validated): void {
            $run->refresh();
            abort_unless($run->stage === 'task-3b', 409, 'This is not a comprehension question.');
            $item = $this->currentComprehensionItem($run);
            abort_unless($item !== null && hash_equals($item['item_key'], $validated['item_key']), 409, 'That question is no longer active.');

            if (! $this->response($run, 'task-3b', $item['item_key'])) {
                $correct = hash_equals($item['correct_choice_key'], $validated['choice']);
                AssessmentResponse::query()->create([
                    'assessment_run_id' => $run->id,
                    'task_key' => 'task-3b',
                    'item_key' => $item['item_key'],
                    'item_order' => (int) $item['story_question_order'],
                    'response_type' => 'choice',
                    'selected_response' => $validated['choice'],
                    'decision' => $correct ? 'CORRECT' : 'INCORRECT',
                    'score' => $correct ? 1 : 0,
                    'evidence' => ['response_committed' => true],
                ]);
            }

            $this->advanceComprehension($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function skip(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        $validated = $request->validate(['item_key' => ['required', 'string', 'max:80']]);

        DB::transaction(function () use ($run, $validated): void {
            $run->refresh();
            abort_unless(in_array($run->stage, ['task-3a', 'task-3b'], true), 409, 'This assessment item cannot be skipped.');
            $item = $run->stage === 'task-3a'
                ? $this->selectedPassage($run)
                : $this->currentComprehensionItem($run);
            abort_unless($item !== null && hash_equals($item['item_key'], $validated['item_key']), 409, 'That item is no longer active.');

            if (! $this->response($run, $run->stage, $item['item_key'])) {
                AssessmentResponse::query()->create([
                    'assessment_run_id' => $run->id,
                    'task_key' => $run->stage,
                    'item_key' => $item['item_key'],
                    'item_order' => $run->stage === 'task-3a' ? 1 : (int) $item['story_question_order'],
                    'response_type' => 'skipped',
                    'decision' => 'SKIPPED',
                    'score' => 0,
                    'evidence' => [
                        'learner_selected_skip' => true,
                        'response_committed' => true,
                    ],
                ]);
            }

            if ($run->stage === 'task-3a') {
                $run->forceFill([
                    'passage_incorrect_words' => 50,
                    'reading_accuracy_percent' => 0,
                    'stage' => 'task-3b',
                    'current_item_index' => 0,
                ])->save();

                return;
            }

            $this->advanceComprehension($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function continueResult(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        DB::transaction(function () use ($run): void {
            $run->refresh();
            abort_unless(
                in_array($run->stage, ['passage-results', 'part-2-results'], true),
                409,
                'Part 2 is not ready to continue.',
            );
            $run->forceFill([
                'stage' => $run->stage === 'passage-results'
                    ? 'part-2-results'
                    : 'assessment-complete',
            ])->save();
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function finish(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        DB::transaction(function () use ($run): void {
            $run->refresh();
            abort_unless($run->stage === 'assessment-complete', 409, 'The assessment is not ready to finish.');
            $completedAt = now();
            LearnerProgressState::query()->updateOrCreate(
                ['learner_id' => $run->learner_id],
                [
                    'stage' => 'required_lessons',
                    'current_required_lesson_order' => 1,
                    'diagnostic_completed_at' => $completedAt,
                    'last_confirmed_at' => $completedAt,
                ],
            );
            $run->forceFill([
                'status' => AssessmentRun::STATUS_COMPLETED,
                'assessment_completed_at' => $completedAt,
            ])->save();
            LearnerAchievement::query()->firstOrCreate(
                ['learner_id' => $run->learner_id, 'achievement_key' => 'reading.ready_reader'],
                ['awarded_at' => $completedAt, 'evidence' => ['assessment_run_id' => $run->id]],
            );
        });

        return response()->json([
            'completed' => true,
            'next_route' => '/learner/dashboard',
        ]);
    }

    /** @return array<string, mixed> */
    private function serialize(AssessmentRun $run): array
    {
        $payload = [
            'run_id' => $run->id,
            'assessment_type' => $run->assessment_type,
            'stage' => $run->stage,
            'selected_story_key' => $run->selected_story_key,
            'progress' => null,
            'story_choices' => [],
            'item' => null,
            'result' => null,
            'completion' => null,
        ];

        if ($run->stage === 'story-selection') {
            $payload['story_choices'] = collect($run->content_snapshot['task-3a'] ?? [])
                ->map(fn (array $story): array => [
                    'story_key' => $story['story_key'],
                    'title' => $story['title'],
                ])->values()->all();
        } elseif ($run->stage === 'task-3a') {
            $passage = $this->selectedPassage($run);
            if ($passage !== null) {
                $payload['progress'] = ['current' => 1, 'total' => 1, 'completed' => 0];
                $payload['item'] = [
                    'item_key' => $passage['item_key'],
                    'kind' => 'passage',
                    'title' => $passage['title'],
                    'display_text' => $passage['display_text'],
                    'authored_pages' => json_decode($passage['authored_pages'], true, flags: JSON_THROW_ON_ERROR),
                    'time_limit_seconds' => (int) $passage['time_limit_seconds'],
                ];
            }
        } elseif ($run->stage === 'task-3b') {
            $questions = $this->selectedQuestions($run);
            $question = $questions[$run->current_item_index] ?? null;
            if ($question !== null) {
                $payload['progress'] = [
                    'current' => $run->current_item_index + 1,
                    'total' => count($questions),
                    'completed' => $run->current_item_index,
                ];
                $payload['item'] = [
                    'item_key' => $question['item_key'],
                    'kind' => 'comprehension',
                    'question_type' => $question['question_type'],
                    'question_text' => $question['question_text'],
                    'choices' => [
                        ['key' => 'a', 'text' => $question['choice_a']],
                        ['key' => 'b', 'text' => $question['choice_b']],
                        ['key' => 'c', 'text' => $question['choice_c']],
                        ['key' => 'd', 'text' => $question['choice_d']],
                    ],
                ];
            }
        } elseif (in_array($run->stage, ['passage-results', 'part-2-results'], true)) {
            $payload['result'] = [
                'score' => $run->final_reading_score,
                'maximum' => 100,
                'profile' => $run->final_reading_profile,
                'reading_accuracy_percent' => $run->reading_accuracy_percent,
                'comprehension_percent' => $run->comprehension_percent,
                'comprehension_score' => $run->comprehension_score,
                'passage_review' => $this->passageReview($run),
            ];
        } elseif ($run->stage === 'assessment-complete') {
            $payload['completion'] = [
                'title' => 'Assessment complete!',
                'message' => 'Your first lesson is ready.',
            ];
        }

        return $payload;
    }

    private function resolveRun(Request $request): AssessmentRun
    {
        $session = $this->sessionResolver->resolve($request);
        $run = AssessmentRun::query()
            ->whereKey($request->route('assessmentRun'))
            ->where('learner_id', $session->learner_id)
            ->where('status', AssessmentRun::STATUS_ACTIVE)
            ->first();
        abort_unless($run !== null, 404, 'That assessment run is unavailable.');

        return $run;
    }

    /** @return array<string, string>|null */
    private function selectedPassage(AssessmentRun $run): ?array
    {
        return collect($run->content_snapshot['task-3a'] ?? [])
            ->first(fn (array $story): bool => $story['story_key'] === $run->selected_story_key);
    }

    /** @return list<array<string, string>> */
    private function selectedQuestions(AssessmentRun $run): array
    {
        return collect($run->content_snapshot['task-3b'] ?? [])
            ->filter(fn (array $question): bool => $question['story_key'] === $run->selected_story_key)
            ->sortBy(fn (array $question): int => (int) $question['story_question_order'])
            ->values()
            ->all();
    }

    /** @return array<string, string>|null */
    private function currentComprehensionItem(AssessmentRun $run): ?array
    {
        return $this->selectedQuestions($run)[$run->current_item_index] ?? null;
    }

    private function response(AssessmentRun $run, string $taskKey, string $itemKey): ?AssessmentResponse
    {
        return AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('task_key', $taskKey)
            ->where('item_key', $itemKey)
            ->first();
    }

    /** @return array<string, mixed> */
    private function passageReview(AssessmentRun $run): array
    {
        $passage = $this->selectedPassage($run);
        $response = $passage === null
            ? null
            : $this->response($run, 'task-3a', $passage['item_key']);

        return $this->passageResults->review(
            $passage ?? [],
            $response?->evidence,
            $response?->response_type,
        );
    }

    private function resumePastCommittedItem(AssessmentRun $run): AssessmentRun
    {
        DB::transaction(function () use ($run): void {
            $run->refresh();
            if ($run->stage === 'task-3a') {
                $passage = $this->selectedPassage($run);
                if ($passage !== null && $this->response($run, 'task-3a', $passage['item_key'])) {
                    $this->advancePastPassage($run);
                }
            } elseif ($run->stage === 'task-3b') {
                $question = $this->currentComprehensionItem($run);
                if ($question !== null && $this->response($run, 'task-3b', $question['item_key'])) {
                    $this->advanceComprehension($run);
                }
            }
        });

        return $run->fresh();
    }

    private function advancePastPassage(AssessmentRun $run): void
    {
        $response = AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('task_key', 'task-3a')
            ->first();
        $accuracy = (int) ($response?->score ?? 0);
        $run->forceFill([
            'passage_incorrect_words' => (int) data_get($response?->evidence, 'scoring.incorrect_words', 50),
            'reading_accuracy_percent' => $accuracy,
            'stage' => 'task-3b',
            'current_item_index' => 0,
        ])->save();
    }

    private function advanceComprehension(AssessmentRun $run): void
    {
        $questions = $this->selectedQuestions($run);
        if ($run->current_item_index + 1 < count($questions)) {
            $run->increment('current_item_index');

            return;
        }

        $score = (int) AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('task_key', 'task-3b')
            ->sum('score');
        $comprehensionPercent = $score * 20;
        $readingAccuracy = (int) ($run->reading_accuracy_percent ?? 0);
        $finalScore = (int) round(($comprehensionPercent * 0.60) + ($readingAccuracy * 0.40));
        $run->forceFill([
            'comprehension_score' => $score,
            'comprehension_percent' => $comprehensionPercent,
            'final_reading_score' => $finalScore,
            'final_reading_profile' => match (true) {
                $finalScore <= 25 => 'Low Emerging Reader',
                $finalScore <= 50 => 'High Emerging Reader',
                $finalScore <= 75 => 'Developing Reader',
                $finalScore <= 90 => 'Transitioning Reader',
                default => 'Reading at Grade Level',
            },
            'stage' => 'passage-results',
            'current_item_index' => 0,
            'part_two_completed_at' => now(),
        ])->save();
    }
}
