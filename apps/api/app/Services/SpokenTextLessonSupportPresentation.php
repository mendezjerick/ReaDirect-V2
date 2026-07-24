<?php

namespace App\Services;

use App\Models\LessonItemAttempt;
use App\Models\LessonResponse;
use App\Models\LessonRun;

class SpokenTextLessonSupportPresentation
{
    public const AFTER_NONE = 'none';

    public const AFTER_RECORD = 'record';

    public const AFTER_CONTINUE_SUPPORT = 'continue_support';

    public const AFTER_ADVANCE = 'advance';

    public function __construct(
        private readonly int $lessonNumber,
        private readonly string $contentIdPrefix,
    ) {}

    /**
     * @param  array<string, mixed>|null  $item
     * @return array<string, mixed>
     */
    public function forCurrentItem(
        LessonRun $run,
        ?LessonResponse $response,
        ?array $item,
    ): array {
        if ($run->status === LessonRun::STATUS_COMPLETED || $item === null) {
            return $this->presentation(
                "lesson-run:{$run->id}:complete",
                [[
                    'kind' => 'published',
                    'speech_key' => "lesson-{$this->lessonNumber}-complete",
                ]],
                'completion',
                self::AFTER_NONE,
            );
        }

        if ($response === null) {
            $position = $run->current_item_index + 1;
            $speechKey = $position === 1
                ? "lesson-{$this->lessonNumber}-mission-1"
                : "lesson-{$this->lessonNumber}-mission-1-item-{$position}";

            return $this->presentation(
                "{$item['content_id']}:introduction",
                [['kind' => 'published', 'speech_key' => $speechKey]],
                'instruction',
                self::AFTER_RECORD,
            );
        }

        $attemptCount = $response->attempts()->count();
        $sequenceKey = implode(':', [
            $response->id,
            $attemptCount,
            $response->teaching_state,
            $response->outcome ?? 'active',
        ]);
        $latestAttempt = LessonItemAttempt::query()
            ->where('lesson_response_id', $response->id)
            ->latest('attempt_sequence')
            ->first();

        if ($response->outcome !== null) {
            return $this->terminalPresentation($sequenceKey, $response);
        }

        if ($response->teaching_state === LessonTeachingStateMachine::STATE_GIVING_CLUE) {
            return $this->presentation(
                $sequenceKey,
                [
                    $this->runtimeFeedback($response),
                    [
                        'kind' => 'published',
                        'speech_key' => "lesson-{$this->lessonNumber}-clue-mission-1",
                    ],
                ],
                'clue',
                self::AFTER_CONTINUE_SUPPORT,
            );
        }

        if ($response->teaching_state === LessonTeachingStateMachine::STATE_DEMONSTRATING) {
            return $this->presentation(
                $sequenceKey,
                [[
                    'kind' => 'published',
                    'speech_key' => $this->demonstrationSpeechKey($item),
                ]],
                'demonstration',
                self::AFTER_CONTINUE_SUPPORT,
            );
        }

        if ($latestAttempt?->attempt_kind === LessonItemAttempt::KIND_TECHNICAL) {
            return $this->presentation(
                $sequenceKey,
                [[
                    'kind' => 'published',
                    'speech_key' => "lesson-{$this->lessonNumber}-technical-retry",
                ]],
                'technical_retry',
                self::AFTER_RECORD,
            );
        }

        return $this->presentation(
            $sequenceKey,
            [],
            in_array($response->teaching_state, [
                LessonTeachingStateMachine::STATE_GUIDED_RETRY,
                LessonTeachingStateMachine::STATE_ECHO_RETRY,
            ], true) ? 'retry' : 'listening',
            self::AFTER_RECORD,
        );
    }

    /** @return array<string, mixed> */
    private function terminalPresentation(
        string $sequenceKey,
        LessonResponse $response,
    ): array {
        $speech = [];
        $final = trim((string) $response->final_transcript);
        if ($response->response_type === 'speech'
            && $final !== ''
            && strtoupper($final) !== 'UNKNOWN') {
            $speech[] = $this->runtimeFeedback($response);
        }

        $speechKey = match ($response->outcome) {
            LessonTeachingStateMachine::OUTCOME_INDEPENDENT_CORRECT => "lesson-{$this->lessonNumber}-feedback-independent",
            LessonTeachingStateMachine::OUTCOME_SUPPORTED_CORRECT => "lesson-{$this->lessonNumber}-feedback-supported",
            LessonTeachingStateMachine::OUTCOME_DEMONSTRATED => "lesson-{$this->lessonNumber}-feedback-demonstrated",
            LessonTeachingStateMachine::OUTCOME_NOT_YET_CORRECT => "lesson-{$this->lessonNumber}-feedback-not-yet",
            LessonTeachingStateMachine::OUTCOME_UNSCORABLE_AUDIO => "lesson-{$this->lessonNumber}-feedback-unscorable",
            default => null,
        };

        if ($speechKey !== null) {
            $speech[] = ['kind' => 'published', 'speech_key' => $speechKey];
        }

        return $this->presentation(
            $sequenceKey,
            $speech,
            'feedback',
            self::AFTER_ADVANCE,
        );
    }

    /** @param array<string, mixed> $item */
    private function demonstrationSpeechKey(array $item): string
    {
        return str_replace(
            $this->contentIdPrefix,
            "lesson-{$this->lessonNumber}-demo-",
            (string) $item['content_id'],
        );
    }

    /** @return array{kind: string, response_id: int} */
    private function runtimeFeedback(LessonResponse $response): array
    {
        return [
            'kind' => 'runtime_feedback',
            'response_id' => $response->id,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $speech
     * @return array<string, mixed>
     */
    private function presentation(
        string $sequenceKey,
        array $speech,
        string $displayMode,
        string $afterSpeech,
    ): array {
        return [
            'sequence_key' => $sequenceKey,
            'speech' => $speech,
            'display_mode' => $displayMode,
            'after_speech' => $afterSpeech,
            'requires_speech_completion' => $speech !== [],
        ];
    }
}
