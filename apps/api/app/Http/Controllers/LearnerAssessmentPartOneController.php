<?php

namespace App\Http\Controllers;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Services\AssessmentContentCatalog;
use App\Services\LearnerAssessmentAsr;
use App\Services\LearnerAssessmentCompletionService;
use App\Services\LearnerFinalAssessmentAccessService;
use App\Services\LearnerSessionResolver;
use App\Services\SpeechEquivalenceResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use RuntimeException;

final class LearnerAssessmentPartOneController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
        private readonly AssessmentContentCatalog $contentCatalog,
        private readonly LearnerAssessmentAsr $asr,
        private readonly SpeechEquivalenceResolver $equivalenceResolver,
        private readonly LearnerAssessmentCompletionService $completion,
        private readonly LearnerFinalAssessmentAccessService $finalAssessmentAccess,
    ) {}

    public function start(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $assessmentType = $this->assessmentType($request);
        if ($assessmentType === AssessmentRun::TYPE_FINAL) {
            $this->finalAssessmentAccess->authorize($session->learner);
        }
        $run = AssessmentRun::query()
            ->where('learner_id', $session->learner_id)
            ->where('assessment_type', $assessmentType)
            ->where('status', AssessmentRun::STATUS_ACTIVE)
            ->latest('id')
            ->first();

        if (! $run) {
            $run = AssessmentRun::query()->create([
                'learner_id' => $session->learner_id,
                'assessment_type' => $assessmentType,
                'content_version' => 'v1',
                'status' => AssessmentRun::STATUS_ACTIVE,
                'stage' => 'orientation',
                'current_item_index' => 0,
                'content_snapshot' => $this->contentCatalog->assessmentSnapshot(),
            ]);
        }
        $run = $this->resumePastCommittedItem($run);

        $session->forceFill(['last_seen_at' => now()])->save();

        return response()->json($this->serialize($run));
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->serialize(
            $this->resumePastCommittedItem($this->resolveRun($request)),
        ));
    }

    public function submitOrientation(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        abort_unless($run->stage === 'orientation', 409, 'The microphone check is already complete.');
        $validated = $request->validate(['audio' => ['required', 'file', 'max:25600']]);

        try {
            $evidence = $this->asr->orientation($validated['audio']);
        } catch (RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 503);
        }

        if (! data_get($evidence, 'audio_quality.usable', false)) {
            return response()->json([
                'message' => 'We could not hear that clearly. Try the microphone check once more.',
            ], 422);
        }

        DB::transaction(function () use ($run): void {
            $run->refresh();
            abort_unless($run->stage === 'orientation', 409, 'The microphone check is already complete.');
            $run->forceFill([
                'orientation_completed_at' => now(),
                'stage' => 'task-1a',
                'current_item_index' => 0,
            ])->save();
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function submitSpeech(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        abort_unless(in_array($run->stage, ['task-1a', 'task-2b'], true), 409, 'This is not a speaking item.');
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
            'audio' => ['required', 'file', 'max:25600'],
        ]);
        $item = $this->currentItem($run);
        abort_unless($item !== null && hash_equals($item['item_key'], $validated['item_key']), 409, 'That item is no longer active.');

        $existing = $this->currentResponse($run, $item);
        if ($existing) {
            DB::transaction(function () use ($run): void {
                $run->refresh();
                $this->advanceCurrentItem($run);
            });

            return response()->json($this->serialize($run->fresh()));
        }

        /** @var UploadedFile $audio */
        $audio = $validated['audio'];
        try {
            if ($run->stage === 'task-1a') {
                $evidence = $this->asr->letter($audio, $item['spoken_target']);
                $rawTranscript = (string) ($evidence['raw_transcript'] ?? '');
                $decision = (string) ($evidence['decision'] ?? 'UNKNOWN');
                $score = $decision === 'CORRECT' ? 1 : 0;
                $scoringTranscript = (string) ($evidence['predicted_class'] ?? 'UNKNOWN');
            } else {
                $evidence = $this->asr->word($audio, $item['spoken_target']);
                $rawTranscript = (string) ($evidence['raw_transcript'] ?? '');
                $resolution = $this->equivalenceResolver->resolve(
                    $item['spoken_target'],
                    $rawTranscript,
                    $item['item_key'],
                );
                $evidence['equivalence_resolution'] = $resolution;
                $score = $resolution['accepted_match'] ? 1 : 0;
                $decision = $score === 1 ? 'CORRECT' : 'INCORRECT';
                $scoringTranscript = $score === 1 ? $item['spoken_target'] : $rawTranscript;
            }
        } catch (RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 503);
        }

        DB::transaction(function () use (
            $run,
            $item,
            $rawTranscript,
            $scoringTranscript,
            $decision,
            $score,
            $evidence,
        ): void {
            AssessmentResponse::query()->create([
                'assessment_run_id' => $run->id,
                'task_key' => $run->stage,
                'item_key' => $item['item_key'],
                'item_order' => (int) $item['sort_order'],
                'response_type' => 'speech',
                'raw_transcript' => $rawTranscript,
                'scoring_transcript' => $scoringTranscript,
                'decision' => $decision,
                'score' => $score,
                'evidence' => $evidence,
            ]);
            $this->advanceCurrentItem($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function submitRhyme(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
            'choice' => ['required', Rule::in(['yes', 'no'])],
        ]);

        DB::transaction(function () use ($run, $validated): void {
            $run->refresh();
            abort_unless($run->stage === 'task-2a', 409, 'This is not a rhyme item.');
            $item = $this->currentItem($run);
            abort_unless($item !== null && hash_equals($item['item_key'], $validated['item_key']), 409, 'That item is no longer active.');

            if (! $this->currentResponse($run, $item)) {
                AssessmentResponse::query()->create([
                    'assessment_run_id' => $run->id,
                    'task_key' => 'task-2a',
                    'item_key' => $item['item_key'],
                    'item_order' => (int) $item['sort_order'],
                    'response_type' => 'choice',
                    'selected_response' => $validated['choice'],
                    'decision' => $validated['choice'] === $item['correct_response'] ? 'CORRECT' : 'INCORRECT',
                    'score' => $validated['choice'] === $item['correct_response'] ? 1 : 0,
                    'evidence' => ['response_committed' => true],
                ]);
            }

            $this->advanceCurrentItem($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function skip(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
        ]);

        DB::transaction(function () use ($run, $validated): void {
            $run->refresh();
            abort_unless(in_array($run->stage, ['task-1a', 'task-2a', 'task-2b'], true), 409, 'This assessment item cannot be skipped.');
            $item = $this->currentItem($run);
            abort_unless($item !== null && hash_equals($item['item_key'], $validated['item_key']), 409, 'That item is no longer active.');

            if (! $this->currentResponse($run, $item)) {
                AssessmentResponse::query()->create([
                    'assessment_run_id' => $run->id,
                    'task_key' => $run->stage,
                    'item_key' => $item['item_key'],
                    'item_order' => (int) $item['sort_order'],
                    'response_type' => 'skipped',
                    'decision' => 'SKIPPED',
                    'score' => 0,
                    'evidence' => [
                        'learner_selected_skip' => true,
                        'response_committed' => true,
                    ],
                ]);
            }

            $this->advanceCurrentItem($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function advance(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);

        DB::transaction(function () use ($run): void {
            $run->refresh();
            if ($run->stage === 'orientation') {
                abort_unless($run->orientation_completed_at !== null, 409, 'Complete the microphone check first.');
                $run->forceFill(['stage' => 'task-1a', 'current_item_index' => 0])->save();

                return;
            }

            abort_unless(in_array($run->stage, ['task-1a', 'task-2a', 'task-2b'], true), 409, 'There is no next item yet.');
            $item = $this->currentItem($run);
            abort_unless($item !== null && $this->currentResponse($run, $item) !== null, 409, 'Submit this answer first.');
            $this->advanceCurrentItem($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function continueResult(Request $request): JsonResponse
    {
        $run = $this->resolveRun($request);

        DB::transaction(function () use ($run): void {
            $run->refresh();
            abort_unless($run->stage === 'part-1-results', 409, 'Part 1 is not ready to continue.');

            if ($run->part_one_branch === 'high') {
                $run->forceFill([
                    'stage' => 'story-selection',
                    'current_item_index' => 0,
                ])->save();

                return;
            }

            $run->forceFill([
                'stage' => 'assessment-complete',
                'current_item_index' => 0,
                'passage_incorrect_words' => 50,
                'reading_accuracy_percent' => 0,
                'comprehension_score' => 0,
                'comprehension_percent' => 0,
                'final_reading_score' => 0,
                'final_reading_profile' => 'Low Emerging Reader',
            ])->save();
        });

        $run->refresh();
        if ($run->stage === 'assessment-complete') {
            $this->completion->complete($run);
        }

        return response()->json([
            'run_id' => $run->id,
            'next_route' => $this->frontendRoute(
                $run,
                $run->stage === 'story-selection' ? 'part-two' : 'complete',
            ),
        ]);
    }

    /** @return array<string, mixed> */
    private function serialize(AssessmentRun $run): array
    {
        $item = $this->currentItem($run);
        $committed = $item !== null && $this->currentResponse($run, $item) !== null;
        $payload = [
            'run_id' => $run->id,
            'assessment_type' => $run->assessment_type,
            'stage' => $run->stage,
            'orientation_ready' => $run->orientation_completed_at !== null,
            'progress' => null,
            'item' => null,
            'response_committed' => $committed,
            'result' => null,
        ];

        if ($item !== null) {
            $items = $run->content_snapshot[$run->stage];
            $payload['progress'] = [
                'current' => $run->current_item_index + 1,
                'total' => count($items),
                'completed' => $run->current_item_index + ($committed ? 1 : 0),
            ];
            $payload['item'] = match ($run->stage) {
                'task-1a' => [
                    'item_key' => $item['item_key'],
                    'display_text' => $item['display_text'],
                    'uppercase_form' => $item['uppercase_form'],
                    'lowercase_form' => $item['lowercase_form'],
                ],
                'task-2a' => [
                    'item_key' => $item['item_key'],
                    'word_one' => $item['word_one'],
                    'word_two' => $item['word_two'],
                ],
                'task-2b' => [
                    'item_key' => $item['item_key'],
                    'display_text' => $item['display_text'],
                ],
            };
        }

        if ($run->stage === 'part-1-results') {
            $payload['result'] = [
                'score' => $run->part_one_score,
                'maximum' => 30,
                'level' => $run->part_one_level,
                'branch' => $run->part_one_branch,
                'segments' => [
                    ['task' => 'Task 1A', 'score' => $run->task_1a_score, 'maximum' => 10, 'status' => 'administered'],
                    ['task' => 'Task 2A', 'score' => $run->task_2a_score, 'maximum' => 10, 'status' => $run->part_one_branch === 'high' ? 'automatic' : 'administered'],
                    ['task' => 'Task 2B', 'score' => $run->task_2b_score, 'maximum' => 10, 'status' => $run->part_one_branch === 'low' ? 'not_administered' : 'administered'],
                ],
                'continues_to_part_two' => $run->part_one_branch === 'high',
            ];
        }

        return $payload;
    }

    private function resolveRun(Request $request): AssessmentRun
    {
        $session = $this->sessionResolver->resolve($request);
        $assessmentType = $this->assessmentType($request);
        if ($assessmentType === AssessmentRun::TYPE_FINAL) {
            $this->finalAssessmentAccess->authorize($session->learner);
        }
        $run = AssessmentRun::query()
            ->whereKey($request->input('run_id', $request->route('assessmentRun')))
            ->where('learner_id', $session->learner_id)
            ->where('assessment_type', $assessmentType)
            ->where('status', AssessmentRun::STATUS_ACTIVE)
            ->first();
        abort_unless($run !== null, 404, 'That assessment run is unavailable.');

        return $run;
    }

    private function assessmentType(Request $request): string
    {
        $assessmentType = (string) $request->route(
            'assessmentType',
            AssessmentRun::TYPE_DIAGNOSTIC,
        );
        abort_unless(
            in_array($assessmentType, [
                AssessmentRun::TYPE_DIAGNOSTIC,
                AssessmentRun::TYPE_FINAL,
            ], true),
            404,
        );

        return $assessmentType;
    }

    private function frontendRoute(AssessmentRun $run, string $page): string
    {
        $prefix = $run->assessment_type === AssessmentRun::TYPE_FINAL
            ? '/learner/final-assessment'
            : '/learner/assessment';

        return "{$prefix}/{$page}";
    }

    /** @return array<string, string>|null */
    private function currentItem(AssessmentRun $run): ?array
    {
        if (! in_array($run->stage, ['task-1a', 'task-2a', 'task-2b'], true)) {
            return null;
        }

        return $run->content_snapshot[$run->stage][$run->current_item_index] ?? null;
    }

    private function currentResponse(AssessmentRun $run, array $item): ?AssessmentResponse
    {
        return AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('task_key', $run->stage)
            ->where('item_key', $item['item_key'])
            ->first();
    }

    private function resumePastCommittedItem(AssessmentRun $run): AssessmentRun
    {
        DB::transaction(function () use ($run): void {
            $run->refresh();
            if ($run->stage === 'orientation' && $run->orientation_completed_at !== null) {
                $run->forceFill([
                    'stage' => 'task-1a',
                    'current_item_index' => 0,
                ])->save();

                return;
            }

            $item = $this->currentItem($run);
            if ($item !== null && $this->currentResponse($run, $item) !== null) {
                $this->advanceCurrentItem($run);
            }
        });

        return $run->fresh();
    }

    private function advanceCurrentItem(AssessmentRun $run): void
    {
        $items = $run->content_snapshot[$run->stage];
        if ($run->current_item_index + 1 < count($items)) {
            $run->increment('current_item_index');

            return;
        }

        $this->completeTask($run);
    }

    private function completeTask(AssessmentRun $run): void
    {
        $score = (int) AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('task_key', $run->stage)
            ->sum('score');

        if ($run->stage === 'task-1a') {
            if ($score <= 6) {
                $run->forceFill([
                    'task_1a_score' => $score,
                    'part_one_branch' => 'low',
                    'stage' => 'task-2a',
                    'current_item_index' => 0,
                ])->save();
            } else {
                $run->forceFill([
                    'task_1a_score' => $score,
                    'task_2a_score' => 10,
                    'part_one_branch' => 'high',
                    'stage' => 'task-2b',
                    'current_item_index' => 0,
                ])->save();
            }

            return;
        }

        if ($run->stage === 'task-2a') {
            $run->task_2a_score = $score;
            $run->task_2b_score = 0;
        } else {
            $run->task_2b_score = $score;
        }

        $partOneScore = (int) $run->task_1a_score + (int) $run->task_2a_score + (int) $run->task_2b_score;
        $run->forceFill([
            'part_one_score' => $partOneScore,
            'part_one_level' => match (true) {
                $partOneScore <= 10 => 'Full Refresher',
                $partOneScore <= 16 => 'Moderate Refresher',
                $partOneScore <= 26 => 'Light Refresher',
                default => 'Grade Ready',
            },
            'stage' => 'part-1-results',
            'current_item_index' => 0,
            'part_one_completed_at' => now(),
        ])->save();
    }
}
