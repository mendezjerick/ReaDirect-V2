<?php

namespace App\Http\Controllers;

use App\Models\LearnerAchievement;
use App\Models\LessonItemAttempt;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Services\LearnerAssessmentAsr;
use App\Services\LearnerSessionResolver;
use App\Services\LessonContentCatalog;
use App\Services\LessonOneSupportPresentation;
use App\Services\LessonPracticeTryService;
use App\Services\LessonTeachingStateMachine;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class LearnerLessonOneController extends Controller
{
    private const MISSIONS = ['mission-1', 'mission-2', 'mission-3'];

    public function __construct(
        private readonly LearnerSessionResolver $sessions,
        private readonly LessonContentCatalog $content,
        private readonly LearnerAssessmentAsr $asr,
        private readonly LessonTeachingStateMachine $teaching,
        private readonly LessonOneSupportPresentation $supportPresentation,
        private readonly LessonPracticeTryService $practiceTries,
    ) {}

    public function start(Request $request): JsonResponse
    {
        $session = $this->sessions->resolve($request);
        $run = LessonRun::query()
            ->where('learner_id', $session->learner_id)
            ->where('lesson_key', 'required-lesson-1')
            ->where('status', LessonRun::STATUS_ACTIVE)
            ->latest('id')->first();

        if (! $run) {
            $run = DB::transaction(fn (): LessonRun => LessonRun::query()->create([
                'learner_id' => $session->learner_id,
                'lesson_key' => 'required-lesson-1',
                'content_version' => 'v1',
                'status' => LessonRun::STATUS_ACTIVE,
                'mission_key' => 'mission-1',
                'current_item_index' => 0,
                'content_snapshot' => $this->content->lessonOneSnapshot($session->learner_id),
            ]));
        }

        return response()->json($this->serialize($run));
    }

    public function show(Request $request, LessonRun $lessonRun): JsonResponse
    {
        return response()->json($this->serialize($this->ownedRun($request, $lessonRun)));
    }

    public function submit(Request $request, LessonRun $lessonRun): JsonResponse
    {
        $run = $this->ownedRun($request, $lessonRun);
        abort_unless($run->status === LessonRun::STATUS_ACTIVE, 409, 'This lesson is already complete.');
        $validated = $request->validate([
            'item_key' => ['required', 'string', 'max:80'],
            'audio' => ['required', 'file', 'max:25600'],
        ]);
        $item = $run->status === LessonRun::STATUS_ACTIVE ? $this->currentItem($run) : null;
        abort_unless($item && hash_equals($item['content_id'], $validated['item_key']), 409, 'That lesson item is no longer active.');

        /** @var UploadedFile $audio */
        $audio = $validated['audio'];
        try {
            $evidence = $this->asr->letter($audio, $item['spoken_target']);
        } catch (RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 503);
        }

        $raw = (string) ($evidence['raw_transcript'] ?? '');
        $final = strtoupper((string) ($evidence['predicted_class'] ?? 'UNKNOWN'));
        if (! preg_match('/^[A-Z]$/', $final)) {
            $final = 'UNKNOWN';
        }
        $classification = $this->classifyEvidence($evidence, $final);
        $diagnosisKey = $this->diagnosisKey($classification);
        $bytes = file_get_contents($audio->getRealPath());
        $extension = strtolower($audio->getClientOriginalExtension() ?: 'webm');

        DB::transaction(function () use (
            $run,
            $item,
            $raw,
            $final,
            $evidence,
            $classification,
            $diagnosisKey,
            $bytes,
            $extension,
        ): void {
            $response = LessonResponse::query()->firstOrCreate(
                [
                    'lesson_run_id' => $run->id,
                    'mission_key' => $run->mission_key,
                    'item_key' => $item['content_id'],
                ],
                [
                    'item_order' => $run->current_item_index + 1,
                    'response_type' => 'speech',
                    'decision' => 'NEEDS_SUPPORT',
                    'teaching_state' => LessonTeachingStateMachine::STATE_LISTENING,
                    'highest_scaffold_used' => LessonTeachingStateMachine::SCAFFOLD_NONE,
                ],
            );
            $response = LessonResponse::query()->lockForUpdate()->findOrFail($response->id);
            $state = $this->stateForResponse($response);

            try {
                $nextState = $this->teaching->recordEvidence($state, $classification, $diagnosisKey);
            } catch (DomainException $error) {
                abort(409, $error->getMessage());
            }

            $attemptSequence = $response->attempts()->count() + 1;
            $attemptKind = $this->attemptKind($state, $classification);
            $academicAttemptNumber = in_array($attemptKind, [
                LessonItemAttempt::KIND_INDEPENDENT,
                LessonItemAttempt::KIND_GUIDED,
            ], true)
                ? (int) $nextState['academic_attempt_count']
                : null;
            $sha = hash('sha256', $bytes);
            $path = "lesson-audio/{$run->id}/{$run->mission_key}/{$item['content_id']}-{$attemptSequence}-{$sha}.{$extension}";
            Storage::disk('local')->put($path, $bytes);
            $decision = $classification === LessonTeachingStateMachine::CLASS_CLEAR_CORRECT
                ? 'CORRECT'
                : 'NEEDS_SUPPORT';

            $response->attempts()->create([
                'attempt_sequence' => $attemptSequence,
                'attempt_kind' => $attemptKind,
                'academic_attempt_number' => $academicAttemptNumber,
                'scaffold_level' => $state['highest_scaffold_used'],
                'audio_classification' => $classification,
                'raw_transcript' => $raw,
                'final_transcript' => $final,
                'decision' => $decision,
                'audio_path' => $path,
                'audio_sha256' => $sha,
                'evidence' => $evidence,
            ]);
            $response->forceFill([
                'response_type' => 'speech',
                'raw_transcript' => $raw,
                'final_transcript' => $final,
                'decision' => $decision,
                'audio_path' => $path,
                'audio_sha256' => $sha,
                'evidence' => [
                    ...$evidence,
                    'audio_classification' => $classification,
                    'diagnosis_key' => $diagnosisKey,
                ],
                ...$this->stateAttributes($nextState, $response),
            ])->save();
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function continueSupport(Request $request, LessonRun $lessonRun): JsonResponse
    {
        $run = $this->ownedRun($request, $lessonRun);
        $validated = $request->validate(['item_key' => ['required', 'string', 'max:80']]);

        DB::transaction(function () use ($run, $validated): void {
            $run->refresh();
            $item = $this->currentItem($run);
            abort_unless($item && hash_equals($item['content_id'], $validated['item_key']), 409, 'That lesson item is no longer active.');
            $response = $this->currentResponse($run, $item);
            abort_unless($response, 409, 'Submit a response before continuing support.');
            $response = LessonResponse::query()->lockForUpdate()->findOrFail($response->id);

            try {
                $nextState = $this->teaching->continueSupport($this->stateForResponse($response));
            } catch (DomainException $error) {
                abort(409, $error->getMessage());
            }

            $response->forceFill($this->stateAttributes($nextState, $response))->save();
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function skip(Request $request, LessonRun $lessonRun): JsonResponse
    {
        $run = $this->ownedRun($request, $lessonRun);
        $validated = $request->validate(['item_key' => ['required', 'string', 'max:80']]);

        DB::transaction(function () use ($run, $validated): void {
            $run->refresh();
            $item = $this->currentItem($run);
            abort_unless($item && hash_equals($item['content_id'], $validated['item_key']), 409, 'That lesson item is no longer active.');
            $response = LessonResponse::query()->firstOrCreate(
                [
                    'lesson_run_id' => $run->id,
                    'mission_key' => $run->mission_key,
                    'item_key' => $item['content_id'],
                ],
                [
                    'item_order' => $run->current_item_index + 1,
                    'response_type' => 'skipped',
                    'decision' => 'SKIPPED',
                    'teaching_state' => LessonTeachingStateMachine::STATE_LISTENING,
                ],
            );
            $response = LessonResponse::query()->lockForUpdate()->findOrFail($response->id);

            try {
                $nextState = $this->teaching->skip($this->stateForResponse($response));
            } catch (DomainException $error) {
                abort(409, $error->getMessage());
            }

            $response->attempts()->create([
                'attempt_sequence' => $response->attempts()->count() + 1,
                'attempt_kind' => LessonItemAttempt::KIND_SKIP,
                'scaffold_level' => $response->highest_scaffold_used,
                'audio_classification' => LessonTeachingStateMachine::CLASS_SKIPPED,
                'decision' => 'SKIPPED',
                'evidence' => ['learner_selected_skip' => true],
            ]);
            $response->forceFill([
                'response_type' => 'skipped',
                'decision' => 'SKIPPED',
                'evidence' => ['learner_selected_skip' => true],
                ...$this->stateAttributes($nextState, $response),
            ])->save();
            $this->advanceRun($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    public function advance(Request $request, LessonRun $lessonRun): JsonResponse
    {
        $run = $this->ownedRun($request, $lessonRun);
        DB::transaction(function () use ($run): void {
            $run->refresh();
            $item = $this->currentItem($run);
            $response = $item ? $this->currentResponse($run, $item) : null;
            abort_unless(
                $response && $this->teaching->canAdvance($this->stateForResponse($response)),
                409,
                'Finish this item before moving on.',
            );
            $this->advanceRun($run);
        });

        return response()->json($this->serialize($run->fresh()));
    }

    private function ownedRun(Request $request, LessonRun $run): LessonRun
    {
        $session = $this->sessions->resolve($request);
        abort_unless($run->learner_id === $session->learner_id, 404);

        return $run;
    }

    /** @return array<string, string>|null */
    private function currentItem(LessonRun $run): ?array
    {
        return data_get($run->content_snapshot, "{$run->mission_key}.{$run->current_item_index}");
    }

    private function currentResponse(LessonRun $run, array $item): ?LessonResponse
    {
        return LessonResponse::query()->where('lesson_run_id', $run->id)
            ->where('mission_key', $run->mission_key)->where('item_key', $item['content_id'])->first();
    }

    private function advanceRun(LessonRun $run): void
    {
        $items = $run->content_snapshot[$run->mission_key] ?? [];
        if ($run->current_item_index + 1 < count($items)) {
            $run->forceFill(['current_item_index' => $run->current_item_index + 1])->save();

            return;
        }

        $missionIndex = array_search($run->mission_key, self::MISSIONS, true);
        if ($missionIndex !== false && isset(self::MISSIONS[$missionIndex + 1])) {
            $run->forceFill(['mission_key' => self::MISSIONS[$missionIndex + 1], 'current_item_index' => 0])->save();

            return;
        }

        $run->forceFill(['status' => LessonRun::STATUS_COMPLETED, 'completed_at' => now()])->save();
        $progress = $run->learner->progressState;
        if ($progress) {
            $progress->forceFill([
                'stage' => 'required_lessons',
                'current_required_lesson_order' => max(2, (int) $progress->current_required_lesson_order),
                'last_confirmed_at' => now(),
            ])->save();
        }
        LearnerAchievement::query()->firstOrCreate(
            ['learner_id' => $run->learner_id, 'achievement_key' => 'reading.letter_leader'],
            ['awarded_at' => now(), 'evidence' => ['lesson_run_id' => $run->id]],
        );
    }

    /** @param array<string, mixed> $evidence */
    private function classifyEvidence(array $evidence, string $final): string
    {
        if (data_get($evidence, 'audio_quality.usable') === false) {
            $reason = strtolower((string) data_get($evidence, 'audio_quality.reason', ''));

            return str_contains($reason, 'silence')
                ? LessonTeachingStateMachine::CLASS_SILENCE
                : LessonTeachingStateMachine::CLASS_UNUSABLE_AUDIO;
        }

        $predictedClass = strtoupper((string) ($evidence['predicted_class'] ?? $final));

        if ($predictedClass === 'SILENCE') {
            return LessonTeachingStateMachine::CLASS_SILENCE;
        }

        if ($predictedClass === 'UNKNOWN' || $final === 'UNKNOWN') {
            return LessonTeachingStateMachine::CLASS_UNCERTAIN;
        }

        return (string) ($evidence['decision'] ?? 'UNKNOWN') === 'CORRECT'
            ? LessonTeachingStateMachine::CLASS_CLEAR_CORRECT
            : LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT;
    }

    private function diagnosisKey(string $classification): string
    {
        return match ($classification) {
            LessonTeachingStateMachine::CLASS_CLEAR_CORRECT => 'correct_letter',
            LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT => 'different_clear_letter',
            LessonTeachingStateMachine::CLASS_SILENCE => 'silence',
            LessonTeachingStateMachine::CLASS_UNUSABLE_AUDIO => 'unusable_audio',
            default => 'uncertain',
        };
    }

    /** @param array<string, mixed> $state */
    private function attemptKind(array $state, string $classification): string
    {
        if (in_array($classification, [
            LessonTeachingStateMachine::CLASS_UNCERTAIN,
            LessonTeachingStateMachine::CLASS_UNUSABLE_AUDIO,
            LessonTeachingStateMachine::CLASS_SILENCE,
        ], true)) {
            return LessonItemAttempt::KIND_TECHNICAL;
        }

        return match ($state['teaching_state']) {
            LessonTeachingStateMachine::STATE_GUIDED_RETRY => LessonItemAttempt::KIND_GUIDED,
            LessonTeachingStateMachine::STATE_ECHO_RETRY => LessonItemAttempt::KIND_ECHO,
            default => LessonItemAttempt::KIND_INDEPENDENT,
        };
    }

    /** @return array<string, mixed> */
    private function stateForResponse(LessonResponse $response): array
    {
        return [
            'teaching_state' => $response->teaching_state,
            'outcome' => $response->outcome,
            'academic_attempt_count' => $response->academic_attempt_count,
            'technical_retry_count' => $response->technical_retry_count,
            'highest_scaffold_used' => $response->highest_scaffold_used,
            'independent_mastery' => $response->independent_mastery,
            'diagnosis_key' => $response->diagnosis_key,
            'review_recommended' => $response->review_recommended,
            'demonstration_given' => $response->demonstration_given_at !== null,
            'terminal' => $response->outcome !== null,
        ];
    }

    /** @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function stateAttributes(array $state, LessonResponse $response): array
    {
        return [
            'teaching_state' => $state['teaching_state'],
            'outcome' => $state['outcome'],
            'academic_attempt_count' => $state['academic_attempt_count'],
            'technical_retry_count' => $state['technical_retry_count'],
            'highest_scaffold_used' => $state['highest_scaffold_used'],
            'independent_mastery' => $state['independent_mastery'],
            'diagnosis_key' => $state['diagnosis_key'],
            'review_recommended' => $state['review_recommended'],
            'demonstration_given_at' => ($state['demonstration_given'] ?? false)
                ? ($response->demonstration_given_at ?? now())
                : null,
            'completed_at' => ($state['terminal'] ?? false)
                ? ($response->completed_at ?? now())
                : null,
        ];
    }

    /** @return array<string, mixed> */
    private function serialize(LessonRun $run): array
    {
        $item = $run->status === LessonRun::STATUS_ACTIVE ? $this->currentItem($run) : null;
        $response = $item ? $this->currentResponse($run, $item) : null;
        $missionNumber = max(1, array_search($run->mission_key, self::MISSIONS, true) + 1);
        $completion = null;

        if ($run->status === LessonRun::STATUS_COMPLETED) {
            $responses = LessonResponse::query()
                ->where('lesson_run_id', $run->id)
                ->get(['mission_key', 'decision', 'outcome', 'independent_mastery']);
            $missionLabels = [
                'mission-1' => 'Letters',
                'mission-2' => 'First letter',
                'mission-3' => 'Missing letter',
            ];
            $segments = collect(self::MISSIONS)->map(function (string $missionKey) use ($responses, $missionLabels): array {
                $missionResponses = $responses->where('mission_key', $missionKey);

                return [
                    'mission_key' => $missionKey,
                    'label' => $missionLabels[$missionKey],
                    'score' => $missionResponses->filter(
                        fn (LessonResponse $response): bool => $response->independent_mastery
                            || ($response->outcome === null && $response->decision === 'CORRECT'),
                    )->count(),
                    'maximum' => $missionResponses->count(),
                    'status' => 'Complete',
                ];
            })->values()->all();

            $completion = [
                'title' => 'Lesson 1 complete!',
                'achievement_key' => 'reading.letter_leader',
                'achievement_name' => 'Letter Leader',
                'score' => $responses->filter(
                    fn (LessonResponse $response): bool => $response->independent_mastery
                        || ($response->outcome === null && $response->decision === 'CORRECT'),
                )->count(),
                'maximum' => $responses->count(),
                'segments' => $segments,
            ];
        }

        $teaching = $run->status === LessonRun::STATUS_COMPLETED
            ? [
                ...$this->teaching->initial(),
                'teaching_state' => LessonTeachingStateMachine::STATE_ADVANCING,
                'terminal' => true,
            ]
            : ($response
                ? $this->stateForResponse($response)
                : $this->teaching->initial());
        $support = $this->supportPresentation->forCurrentItem($run, $response, $item);

        return [
            'run_id' => $run->id,
            'lesson_key' => $run->lesson_key,
            'status' => $run->status,
            'mission' => ['key' => $run->mission_key, 'number' => $missionNumber, 'total' => 3],
            'progress' => ['current' => $run->current_item_index + 1, 'total' => 5],
            'item' => $item ? [
                'item_key' => $item['content_id'],
                'uppercase_form' => $item['uppercase_form'],
                'lowercase_form' => $item['lowercase_form'],
                'context_word' => $item['context_word'],
                'highlighted_display' => $item['highlighted_display'],
                'missing_display' => $item['missing_display'],
            ] : null,
            'response' => $response ? [
                'id' => $response->id,
                'decision' => $response->decision,
                'final_transcript' => $response->final_transcript,
                'response_type' => $response->response_type,
                'outcome' => $response->outcome,
                'academic_attempt_count' => $response->academic_attempt_count,
                'technical_retry_count' => $response->technical_retry_count,
                'highest_scaffold_used' => $response->highest_scaffold_used,
                'independent_mastery' => $response->independent_mastery,
                'diagnosis_key' => $response->diagnosis_key,
                'review_recommended' => $response->review_recommended,
                'attempt_count' => $response->attempts()->count(),
            ] : null,
            'teaching' => [
                'state' => $teaching['teaching_state'],
                'outcome' => $teaching['outcome'],
                'academic_attempt_count' => $teaching['academic_attempt_count'],
                'technical_retry_count' => $teaching['technical_retry_count'],
                'highest_scaffold_used' => $teaching['highest_scaffold_used'],
                'independent_mastery' => $teaching['independent_mastery'],
                'diagnosis_key' => $teaching['diagnosis_key'],
                'review_recommended' => $teaching['review_recommended'],
                'can_record' => $this->teaching->canRecord($teaching),
                'can_continue_support' => $this->teaching->canContinueSupport($teaching),
                'can_advance' => $this->teaching->canAdvance($teaching),
            ],
            'support' => $support,
            'practice_tries' => $this->practiceTries->forRun($run),
            'completion' => $completion,
        ];
    }
}
