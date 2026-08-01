<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\LessonResponse;

final class LearnerSpeechPolicy
{
    public function __construct(
        private readonly LearnerLightweightModeSettings $lightweightSettings,
    ) {}

    public function isPublishedOnly(): bool
    {
        return $this->lightweightSettings->learnerContract()['speech_mode']
            === 'published_only';
    }

    /** @param list<string> $runtimeProfiles
     * @return list<string>
     */
    public function runtimeProfiles(array $runtimeProfiles): array
    {
        return $this->isPublishedOnly() ? [] : $runtimeProfiles;
    }

    public function allowsRuntimeFeedback(LessonResponse $response): bool
    {
        return ! $this->isPublishedOnly()
            && $response->outcome === null
            && $response->teaching_state === LessonTeachingStateMachine::STATE_GIVING_CLUE
            && (int) $response->academic_attempt_count === 1;
    }

    public function allowsRuntimeDemonstration(LessonResponse $response): bool
    {
        return ! $this->isPublishedOnly()
            && $response->outcome === null
            && $response->run->lesson_key === 'required-lesson-2'
            && $response->teaching_state === LessonTeachingStateMachine::STATE_DEMONSTRATING;
    }

    public function firstIncorrectSpeechKey(LessonResponse $response): ?string
    {
        return match ($response->run->lesson_key) {
            'required-lesson-1' => 'lesson-1-feedback-incorrect-first',
            'required-lesson-2' => 'lesson-2-feedback-incorrect-first',
            'required-lesson-3' => 'lesson-3-feedback-incorrect-first',
            'required-lesson-4' => 'lesson-4-feedback-incorrect-first',
            default => null,
        };
    }
}
