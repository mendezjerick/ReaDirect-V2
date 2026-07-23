<?php

namespace App\Services;

use DomainException;

final class LessonTeachingStateMachine
{
    public const STATE_LISTENING = 'LISTENING';

    public const STATE_INDEPENDENT_FEEDBACK = 'INDEPENDENT_FEEDBACK';

    public const STATE_GIVING_CLUE = 'GIVING_CLUE';

    public const STATE_GUIDED_RETRY = 'GUIDED_RETRY';

    public const STATE_DEMONSTRATING = 'DEMONSTRATING';

    public const STATE_ECHO_RETRY = 'ECHO_RETRY';

    public const STATE_REVIEW_SCHEDULED = 'REVIEW_SCHEDULED';

    public const STATE_ADVANCING = 'ADVANCING';

    public const OUTCOME_INDEPENDENT_CORRECT = 'INDEPENDENT_CORRECT';

    public const OUTCOME_SUPPORTED_CORRECT = 'SUPPORTED_CORRECT';

    public const OUTCOME_DEMONSTRATED = 'DEMONSTRATED';

    public const OUTCOME_NOT_YET_CORRECT = 'NOT_YET_CORRECT';

    public const OUTCOME_UNSCORABLE_AUDIO = 'UNSCORABLE_AUDIO';

    public const OUTCOME_SKIPPED = 'SKIPPED';

    public const CLASS_CLEAR_CORRECT = 'CLEAR_CORRECT';

    public const CLASS_CLEAR_INCORRECT = 'CLEAR_INCORRECT';

    public const CLASS_UNCERTAIN = 'UNCERTAIN';

    public const CLASS_UNUSABLE_AUDIO = 'UNUSABLE_AUDIO';

    public const CLASS_SILENCE = 'SILENCE';

    public const CLASS_SKIPPED = 'SKIPPED';

    public const SCAFFOLD_NONE = 'none';

    public const SCAFFOLD_TARGETED_CLUE = 'targeted_clue';

    public const SCAFFOLD_DEMONSTRATION = 'demonstration';

    public const SCAFFOLD_ECHO = 'echo';

    public const MAX_ACADEMIC_ATTEMPTS = 2;

    public const MAX_TECHNICAL_RETRIES = 2;

    /** @return array<string, mixed> */
    public function initial(): array
    {
        return [
            'teaching_state' => self::STATE_LISTENING,
            'outcome' => null,
            'academic_attempt_count' => 0,
            'technical_retry_count' => 0,
            'highest_scaffold_used' => self::SCAFFOLD_NONE,
            'independent_mastery' => false,
            'diagnosis_key' => null,
            'review_recommended' => false,
            'demonstration_given' => false,
            'terminal' => false,
        ];
    }

    /** @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public function recordEvidence(array $state, string $classification, ?string $diagnosisKey): array
    {
        $this->assertActive($state);
        $teachingState = (string) ($state['teaching_state'] ?? '');

        if (! in_array($teachingState, [
            self::STATE_LISTENING,
            self::STATE_GUIDED_RETRY,
            self::STATE_ECHO_RETRY,
        ], true)) {
            throw new DomainException("Recording is not available while the lesson is {$teachingState}.");
        }

        if (in_array($classification, [
            self::CLASS_UNCERTAIN,
            self::CLASS_UNUSABLE_AUDIO,
            self::CLASS_SILENCE,
        ], true)) {
            return $this->recordTechnicalRetry($state, $diagnosisKey);
        }

        if (! in_array($classification, [
            self::CLASS_CLEAR_CORRECT,
            self::CLASS_CLEAR_INCORRECT,
        ], true)) {
            throw new DomainException("Unsupported lesson evidence classification {$classification}.");
        }

        if ($teachingState === self::STATE_ECHO_RETRY) {
            return $this->terminal(
                [
                    ...$state,
                    'highest_scaffold_used' => self::SCAFFOLD_ECHO,
                    'diagnosis_key' => $diagnosisKey,
                ],
                $classification === self::CLASS_CLEAR_CORRECT
                    ? self::OUTCOME_DEMONSTRATED
                    : self::OUTCOME_NOT_YET_CORRECT,
                false,
                true,
            );
        }

        $academicAttempts = (int) ($state['academic_attempt_count'] ?? 0) + 1;
        if ($academicAttempts > self::MAX_ACADEMIC_ATTEMPTS) {
            throw new DomainException('The lesson cannot record more than two academic attempts before demonstration.');
        }

        $next = [
            ...$state,
            'academic_attempt_count' => $academicAttempts,
            'diagnosis_key' => $diagnosisKey,
        ];

        if ($classification === self::CLASS_CLEAR_CORRECT) {
            return $this->terminal(
                $next,
                $academicAttempts === 1
                    ? self::OUTCOME_INDEPENDENT_CORRECT
                    : self::OUTCOME_SUPPORTED_CORRECT,
                $academicAttempts === 1,
                $academicAttempts > 1,
                self::STATE_INDEPENDENT_FEEDBACK,
            );
        }

        if ($academicAttempts === 1) {
            return [
                ...$next,
                'teaching_state' => self::STATE_GIVING_CLUE,
            ];
        }

        return [
            ...$next,
            'teaching_state' => self::STATE_DEMONSTRATING,
            'review_recommended' => true,
        ];
    }

    /** @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public function continueSupport(array $state): array
    {
        $this->assertActive($state);

        return match ($state['teaching_state'] ?? null) {
            self::STATE_GIVING_CLUE => [
                ...$state,
                'teaching_state' => self::STATE_GUIDED_RETRY,
                'highest_scaffold_used' => self::SCAFFOLD_TARGETED_CLUE,
            ],
            self::STATE_DEMONSTRATING => [
                ...$state,
                'teaching_state' => self::STATE_ECHO_RETRY,
                'highest_scaffold_used' => self::SCAFFOLD_DEMONSTRATION,
                'demonstration_given' => true,
            ],
            default => throw new DomainException('There is no pending lesson support step to continue.'),
        };
    }

    /** @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public function skip(array $state): array
    {
        $this->assertActive($state);

        return $this->terminal(
            $state,
            self::OUTCOME_SKIPPED,
            false,
            false,
            self::STATE_ADVANCING,
        );
    }

    /** @param array<string, mixed> $state */
    public function canRecord(array $state): bool
    {
        return ! ($state['terminal'] ?? false)
            && in_array($state['teaching_state'] ?? null, [
                self::STATE_LISTENING,
                self::STATE_GUIDED_RETRY,
                self::STATE_ECHO_RETRY,
            ], true);
    }

    /** @param array<string, mixed> $state */
    public function canContinueSupport(array $state): bool
    {
        return ! ($state['terminal'] ?? false)
            && in_array($state['teaching_state'] ?? null, [
                self::STATE_GIVING_CLUE,
                self::STATE_DEMONSTRATING,
            ], true);
    }

    /** @param array<string, mixed> $state */
    public function canAdvance(array $state): bool
    {
        return (bool) ($state['terminal'] ?? false);
    }

    /** @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function recordTechnicalRetry(array $state, ?string $diagnosisKey): array
    {
        $technicalRetries = (int) ($state['technical_retry_count'] ?? 0) + 1;
        $next = [
            ...$state,
            'technical_retry_count' => $technicalRetries,
            'diagnosis_key' => $diagnosisKey,
        ];

        if ($technicalRetries < self::MAX_TECHNICAL_RETRIES) {
            return $next;
        }

        return match ($state['teaching_state'] ?? null) {
            self::STATE_GUIDED_RETRY => [
                ...$next,
                'teaching_state' => self::STATE_DEMONSTRATING,
                'review_recommended' => true,
            ],
            self::STATE_ECHO_RETRY => $this->terminal(
                $next,
                self::OUTCOME_NOT_YET_CORRECT,
                false,
                true,
            ),
            default => $this->terminal(
                $next,
                self::OUTCOME_UNSCORABLE_AUDIO,
                false,
                false,
            ),
        };
    }

    /** @param array<string, mixed> $state */
    private function assertActive(array $state): void
    {
        if ($state['terminal'] ?? false) {
            throw new DomainException('This lesson item already has a final outcome.');
        }
    }

    /** @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function terminal(
        array $state,
        string $outcome,
        bool $independentMastery,
        bool $reviewRecommended,
        string $teachingState = self::STATE_REVIEW_SCHEDULED,
    ): array {
        return [
            ...$state,
            'teaching_state' => $teachingState,
            'outcome' => $outcome,
            'independent_mastery' => $independentMastery,
            'review_recommended' => $reviewRecommended,
            'terminal' => true,
        ];
    }
}
