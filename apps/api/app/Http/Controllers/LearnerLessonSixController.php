<?php

namespace App\Http\Controllers;

use App\Models\LessonItemAttempt;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Services\LearnerLessonAccessService;
use App\Services\LearnerLessonCompletionService;
use App\Services\LearnerSessionResolver;
use App\Services\LessonContentCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

final class LearnerLessonSixController extends Controller
{
    private const LESSON_KEY = 'required-lesson-6';

    private const CHOICE_KEYS = ['a', 'b', 'c', 'd'];

    public function __construct(
        private readonly LearnerSessionResolver $sessions,
        private readonly LearnerLessonAccessService $lessonAccess,
        private readonly LearnerLessonCompletionService $lessonCompletion,
        private readonly LessonContentCatalog $content,
    ) {}

    public function start(Request $request): JsonResponse
    {
        $session = $this->sessions->resolve($request);
        $run = $this->lessonAccess->startOrResume(
            $session->learner,
            self::LESSON_KEY,
            fn (): array => $this->content->lessonSixSnapshot(
                $session->learner_id,
            ),
        );

        return response()->json($this->serialize($run));
    }

    public function show(Request $request, LessonRun $lessonRun): JsonResponse
    {
        return response()->json(
            $this->serialize($this->ownedRun($request, $lessonRun)),
        );
    }

    public function submit(Request $request, LessonRun $lessonRun): JsonResponse
    {
        $run = $this->ownedActiveRun($request, $lessonRun);
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
            'choice' => ['required', Rule::in(self::CHOICE_KEYS)],
        ]);

        DB::transaction(function () use ($run, $validated): void {
            $run = LessonRun::query()->lockForUpdate()->findOrFail($run->id);
            $item = $this->currentItem($run);
            abort_unless(
                $item
                    && hash_equals($item['content_id'], $validated['item_key']),
                409,
                'That lesson question is no longer active.',
            );

            $response = LessonResponse::query()->firstOrCreate(
                [
                    'lesson_run_id' => $run->id,
                    'mission_key' => 'mission-1',
                    'item_key' => $item['content_id'],
                ],
                [
                    'item_order' => $run->current_item_index + 1,
                    'response_type' => 'choice',
                    'decision' => 'NEEDS_SUPPORT',
                    'teaching_state' => 'LISTENING',
                    'highest_scaffold_used' => 'none',
                    'evidence' => [
                        'disabled_choices' => [],
                        'assistance_level' => 'none',
                    ],
                ],
            );
            $response = LessonResponse::query()
                ->lockForUpdate()
                ->findOrFail($response->id);

            abort_if(
                $response->outcome !== null,
                409,
                'This lesson question is already complete.',
            );

            $evidence = is_array($response->evidence)
                ? $response->evidence
                : [];
            $disabledChoices = array_values(array_unique(array_filter(
                $evidence['disabled_choices'] ?? [],
                fn (mixed $choice): bool => is_string($choice)
                    && in_array($choice, self::CHOICE_KEYS, true),
            )));
            abort_if(
                in_array($validated['choice'], $disabledChoices, true),
                409,
                'Choose one of the remaining answers.',
            );

            $correct = hash_equals(
                $item['correct_choice_key'],
                $validated['choice'],
            );
            $attemptNumber = $response->attempts()->count() + 1;
            $wrongCount = (int) ($evidence['wrong_choice_count'] ?? 0);
            $assistanceBeforeAttempt = (string) (
                $evidence['assistance_level'] ?? 'none'
            );

            $response->attempts()->create([
                'attempt_sequence' => $attemptNumber,
                'attempt_kind' => $assistanceBeforeAttempt === 'none'
                    ? LessonItemAttempt::KIND_INDEPENDENT
                    : LessonItemAttempt::KIND_GUIDED,
                'academic_attempt_number' => $attemptNumber,
                'scaffold_level' => $assistanceBeforeAttempt,
                'audio_classification' => $correct
                    ? 'CHOICE_CORRECT'
                    : 'CHOICE_INCORRECT',
                'decision' => $correct ? 'CORRECT' : 'NEEDS_SUPPORT',
                'evidence' => [
                    'selected_choice' => $validated['choice'],
                    'selected_text' => $item[
                        "choice_{$validated['choice']}"
                    ],
                    'correct' => $correct,
                ],
            ]);

            if ($correct) {
                $outcome = match ($assistanceBeforeAttempt) {
                    'none' => 'INDEPENDENT_CORRECT',
                    'demonstration' => 'DEMONSTRATED',
                    default => 'SUPPORTED_CORRECT',
                };
                $response->forceFill([
                    'response_type' => 'choice',
                    'decision' => 'CORRECT',
                    'teaching_state' => 'INDEPENDENT_FEEDBACK',
                    'outcome' => $outcome,
                    'academic_attempt_count' => $attemptNumber,
                    'highest_scaffold_used' => $assistanceBeforeAttempt,
                    'independent_mastery' => $outcome === 'INDEPENDENT_CORRECT',
                    'diagnosis_key' => null,
                    'review_recommended' => $outcome !== 'INDEPENDENT_CORRECT',
                    'completed_at' => now(),
                    'evidence' => [
                        ...$evidence,
                        'last_selected_choice' => $validated['choice'],
                        'resolved_choice' => $validated['choice'],
                        'correct_answer_text' => $item['correct_answer_text'],
                    ],
                ])->save();

                return;
            }

            $wrongCount++;
            $disabledChoices[] = $validated['choice'];
            $disabledChoices = array_values(array_unique($disabledChoices));
            $assistanceLevel = match (true) {
                $wrongCount === 1 => 'targeted_clue',
                $wrongCount === 2 => 'guided_display',
                default => 'demonstration',
            };
            $response->forceFill([
                'response_type' => 'choice',
                'decision' => 'NEEDS_SUPPORT',
                'teaching_state' => match ($assistanceLevel) {
                    'targeted_clue' => 'GIVING_CLUE',
                    'guided_display' => 'GUIDED_RETRY',
                    default => 'DEMONSTRATING',
                },
                'academic_attempt_count' => $attemptNumber,
                'highest_scaffold_used' => $assistanceLevel,
                'diagnosis_key' => 'different_choice',
                'review_recommended' => true,
                'demonstration_given_at' => $assistanceLevel === 'demonstration'
                    ? now()
                    : null,
                'evidence' => [
                    ...$evidence,
                    'last_selected_choice' => $validated['choice'],
                    'wrong_choice_count' => $wrongCount,
                    'disabled_choices' => $disabledChoices,
                    'assistance_level' => $assistanceLevel,
                    'reveal_evidence' => in_array(
                        $assistanceLevel,
                        ['guided_display', 'demonstration'],
                        true,
                    ),
                    'reveal_correct_choice' => $assistanceLevel
                        === 'demonstration',
                ],
            ])->save();
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function skip(Request $request, LessonRun $lessonRun): JsonResponse
    {
        $run = $this->ownedActiveRun($request, $lessonRun);
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
        ]);

        DB::transaction(function () use ($run, $validated): void {
            $run = LessonRun::query()->lockForUpdate()->findOrFail($run->id);
            $item = $this->currentItem($run);
            abort_unless(
                $item
                    && hash_equals($item['content_id'], $validated['item_key']),
                409,
                'That lesson question is no longer active.',
            );

            $response = LessonResponse::query()->firstOrCreate(
                [
                    'lesson_run_id' => $run->id,
                    'mission_key' => 'mission-1',
                    'item_key' => $item['content_id'],
                ],
                [
                    'item_order' => $run->current_item_index + 1,
                    'response_type' => 'skipped',
                    'decision' => 'SKIPPED',
                    'teaching_state' => 'ADVANCING',
                    'outcome' => 'SKIPPED',
                    'completed_at' => now(),
                    'evidence' => ['learner_selected_skip' => true],
                ],
            );
            $response = LessonResponse::query()
                ->lockForUpdate()
                ->findOrFail($response->id);

            if ($response->attempts()
                ->where('attempt_kind', LessonItemAttempt::KIND_SKIP)
                ->doesntExist()) {
                $response->attempts()->create([
                    'attempt_sequence' => $response->attempts()->count() + 1,
                    'attempt_kind' => LessonItemAttempt::KIND_SKIP,
                    'scaffold_level' => $response->highest_scaffold_used,
                    'audio_classification' => 'SKIPPED',
                    'decision' => 'SKIPPED',
                    'evidence' => ['learner_selected_skip' => true],
                ]);
            }

            $response->forceFill([
                'response_type' => 'skipped',
                'decision' => 'SKIPPED',
                'teaching_state' => 'ADVANCING',
                'outcome' => 'SKIPPED',
                'completed_at' => $response->completed_at ?? now(),
                'evidence' => [
                    ...(is_array($response->evidence)
                        ? $response->evidence
                        : []),
                    'learner_selected_skip' => true,
                ],
            ])->save();

            $this->advanceRun($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function advance(Request $request, LessonRun $lessonRun): JsonResponse
    {
        $run = $this->ownedActiveRun($request, $lessonRun);

        DB::transaction(function () use ($run): void {
            $run = LessonRun::query()->lockForUpdate()->findOrFail($run->id);
            $item = $this->currentItem($run);
            $response = $item ? $this->currentResponse($run, $item) : null;
            abort_unless(
                $response
                    && in_array($response->outcome, [
                        'INDEPENDENT_CORRECT',
                        'SUPPORTED_CORRECT',
                        'DEMONSTRATED',
                    ], true),
                409,
                'Choose the correct answer before moving on.',
            );

            $this->advanceRun($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    private function ownedRun(Request $request, LessonRun $run): LessonRun
    {
        $session = $this->sessions->resolve($request);
        abort_unless(
            $run->learner_id === $session->learner_id
                && $run->lesson_key === self::LESSON_KEY,
            404,
        );
        $this->lessonAccess->authorize($session->learner);

        return $run;
    }

    private function ownedActiveRun(
        Request $request,
        LessonRun $run,
    ): LessonRun {
        $run = $this->ownedRun($request, $run);
        abort_unless(
            $run->status === LessonRun::STATUS_ACTIVE,
            409,
            'This lesson is already complete.',
        );

        return $run;
    }

    /** @return array<string, string>|null */
    private function currentItem(LessonRun $run): ?array
    {
        if ($run->status !== LessonRun::STATUS_ACTIVE) {
            return null;
        }

        return data_get(
            $run->content_snapshot,
            "mission-1.{$run->current_item_index}",
        );
    }

    /** @param array<string, string> $item */
    private function currentResponse(
        LessonRun $run,
        array $item,
    ): ?LessonResponse {
        return LessonResponse::query()
            ->where('lesson_run_id', $run->id)
            ->where('mission_key', 'mission-1')
            ->where('item_key', $item['content_id'])
            ->first();
    }

    private function advanceRun(LessonRun $run): void
    {
        $items = $run->content_snapshot['mission-1'] ?? [];
        if ($run->current_item_index + 1 < count($items)) {
            $run->forceFill([
                'current_item_index' => $run->current_item_index + 1,
            ])->save();

            return;
        }

        $this->lessonCompletion->complete(
            $run,
            'reading.question_detective',
        );
    }

    /** @return array<string, mixed> */
    private function serialize(LessonRun $run): array
    {
        $item = $this->currentItem($run);
        $response = $item ? $this->currentResponse($run, $item) : null;
        $evidence = is_array($response?->evidence)
            ? $response->evidence
            : [];
        $assistanceLevel = (string) (
            $evidence['assistance_level'] ?? 'none'
        );
        $slug = $item
            ? str_replace('lesson-v1-comprehension-', '', $item['content_id'])
            : '';
        $questionSpeechKey = $item ? "lesson-6-question-{$slug}" : null;
        $supportSpeechKey = match (true) {
            $run->status === LessonRun::STATUS_COMPLETED => 'lesson-6-complete',
            $response?->outcome !== null => "lesson-6-correct-{$slug}",
            $assistanceLevel === 'targeted_clue' => "lesson-6-clue-{$item['question_type']}",
            $assistanceLevel === 'guided_display' => "lesson-6-guided-{$slug}",
            $assistanceLevel === 'demonstration' => "lesson-6-demo-{$slug}",
            default => $questionSpeechKey,
        };
        $responses = LessonResponse::query()
            ->where('lesson_run_id', $run->id)
            ->get();
        $resolvedCount = $responses->whereNotNull('outcome')->count();

        return [
            'run_id' => $run->id,
            'lesson_key' => $run->lesson_key,
            'content_version' => $run->content_version,
            'status' => $run->status,
            'mission' => [
                'key' => 'mission-1',
                'number' => 1,
                'total' => 1,
                'title' => 'Answer the questions',
            ],
            'progress' => [
                'current' => min($run->current_item_index + 1, 5),
                'total' => 5,
            ],
            'item' => $item ? [
                'item_key' => $item['content_id'],
                'question_type' => $item['question_type'],
                'display_sentence' => $item['display_text'],
                'question_text' => $item['question_audio_text'],
                'choices' => collect(self::CHOICE_KEYS)->map(
                    fn (string $key): array => [
                        'key' => $key,
                        'text' => $item["choice_{$key}"],
                    ],
                )->values()->all(),
                'evidence_span' => ($evidence['reveal_evidence'] ?? false)
                    ? $item['highlightable_evidence_span']
                    : null,
                'correct_choice_key' => (
                    ($evidence['reveal_correct_choice'] ?? false)
                    || $response?->decision === 'CORRECT'
                )
                    ? $item['correct_choice_key']
                    : null,
            ] : null,
            'response' => $response ? [
                'id' => $response->id,
                'decision' => $response->decision,
                'outcome' => $response->outcome,
                'attempt_count' => $response->attempts()->count(),
                'wrong_choice_count' => (int) (
                    $evidence['wrong_choice_count'] ?? 0
                ),
                'assistance_level' => $assistanceLevel,
                'disabled_choices' => array_values(
                    $evidence['disabled_choices'] ?? [],
                ),
                'last_selected_choice' => $evidence[
                    'last_selected_choice'
                ] ?? null,
            ] : null,
            'teaching' => [
                'can_choose' => $run->status === LessonRun::STATUS_ACTIVE
                    && $response?->outcome === null,
                'can_advance' => in_array($response?->outcome, [
                    'INDEPENDENT_CORRECT',
                    'SUPPORTED_CORRECT',
                    'DEMONSTRATED',
                ], true),
                'assistance_level' => $assistanceLevel,
                'show_evidence' => (bool) (
                    $evidence['reveal_evidence'] ?? false
                ),
                'show_correct_choice' => (bool) (
                    $evidence['reveal_correct_choice'] ?? false
                ),
            ],
            'support' => [
                'sequence_key' => implode(':', [
                    $run->status,
                    $item['content_id'] ?? 'complete',
                    $response?->attempts()->count() ?? 0,
                    $response?->decision ?? 'question',
                ]),
                'speech_key' => $supportSpeechKey,
                'speech_keys' => $run->status === LessonRun::STATUS_ACTIVE
                    && $run->current_item_index === 0
                    && $response === null
                    ? ['lesson-6-mission-1', $questionSpeechKey]
                    : array_values(array_filter([$supportSpeechKey])),
                'requires_speech_completion' => true,
            ],
            'completion' => $run->status === LessonRun::STATUS_COMPLETED
                ? $this->lessonCompletion->completionPayload($run, [
                    'title' => 'Lesson 6 complete.',
                    'achievement_key' => 'reading.question_detective',
                    'achievement_name' => 'Question Detective',
                    'resolved_count' => $resolvedCount,
                    'total' => 5,
                ])
                : null,
        ];
    }
}
