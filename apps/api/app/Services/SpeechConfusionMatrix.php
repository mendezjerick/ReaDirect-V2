<?php

namespace App\Services;

use App\Models\SpeechSandboxAttempt;
use Illuminate\Support\Collection;

final class SpeechConfusionMatrix
{
    public const AUDIT_VERSION = 'four-voice-item-token-v2';

    public const LEGACY_CONTENT_AUDIT_VERSION = 'two-voice-item-token-v1';

    public const LETTER_AUDIT_VERSION = 'three-voice-letter-alias-v1';

    public const NEGATIVE_AUDIT_VERSION = 'content-distractor-raw-v1';

    public const LETTER_NEGATIVE_AUDIT_VERSION = 'letter-distractor-raw-v1';

    public const OVERALL_EVALUATION_VERSION = 'content-and-letter-distractor-raw-v1';

    public const EMPTY_TOKEN = '__none__';

    /**
     * @return array<string, mixed>
     */
    public function raw(?string $fixtureSet = null, ?string $taskType = null): array
    {
        $allAttempts = SpeechSandboxAttempt::query()
            ->whereIn('mode', [SpeechSandboxAttempt::MODE_GENERAL, SpeechSandboxAttempt::MODE_LETTER])
            ->where('service_status', 200)
            ->orderBy('id')
            ->get()
            ->filter(fn (SpeechSandboxAttempt $attempt): bool => $this->isFixtureAuditAttempt($attempt))
            ->values();

        $availableFixtureSets = $this->availableValues($allAttempts, 'fixture_set');
        $availableTaskTypes = $this->availableValues($allAttempts, 'task_type');
        $attempts = $allAttempts
            ->when($fixtureSet !== null, fn (Collection $items): Collection => $items->filter(
                fn (SpeechSandboxAttempt $attempt): bool => ($attempt->request_metadata['fixture_set'] ?? null) === $fixtureSet,
            ))
            ->when($taskType !== null, fn (Collection $items): Collection => $items->filter(
                fn (SpeechSandboxAttempt $attempt): bool => ($attempt->request_metadata['task_type'] ?? null) === $taskType,
            ))
            ->values();

        $cells = [];
        $exactAttempts = 0;
        $matchedTokens = 0;
        $expectedTokens = 0;
        $substitutions = 0;
        $omissions = 0;
        $insertions = 0;

        foreach ($attempts as $attempt) {
            $comparison = $this->rawComparison($attempt);
            if (($comparison['exact_match'] ?? false) === true) {
                $exactAttempts++;
            }

            foreach ($comparison['differences'] ?? [] as $difference) {
                $status = (string) ($difference['status'] ?? '');
                if (! in_array($status, ['match', 'substitution', 'omission', 'insertion'], true)) {
                    continue;
                }

                $expected = $this->token($difference['expected'] ?? null);
                $recognized = $this->token($difference['recognized'] ?? null);
                $key = $expected."\0".$recognized;
                $cells[$key] = ($cells[$key] ?? 0) + 1;

                if ($status !== 'insertion') {
                    $expectedTokens++;
                }
                if ($status === 'match') {
                    $matchedTokens++;
                } elseif ($status === 'substitution') {
                    $substitutions++;
                } elseif ($status === 'omission') {
                    $omissions++;
                } else {
                    $insertions++;
                }
            }
        }

        $matrixCells = collect($cells)
            ->map(function (int $count, string $key): array {
                [$expected, $recognized] = explode("\0", $key, 2);

                return [
                    'expected' => $expected,
                    'recognized' => $recognized,
                    'count' => $count,
                    'kind' => $expected === $recognized ? 'match' : 'confusion',
                ];
            })
            ->sortBy(fn (array $cell): string => $this->sortKey($cell['expected'])
                ."\0".$this->sortKey($cell['recognized']))
            ->values();

        $expectedLabels = $matrixCells->pluck('expected')->unique()->sortBy(
            fn (string $label): string => $this->sortKey($label),
        )->values();
        $recognizedLabels = $matrixCells->pluck('recognized')->unique()->sortBy(
            fn (string $label): string => $this->sortKey($label),
        )->values();
        $confusions = $matrixCells
            ->where('kind', 'confusion')
            ->sortByDesc('count')
            ->values();

        $binaryClassifications = $this->rawBinaryClassifications($allAttempts);

        return [
            'mode' => 'raw',
            'audit_version' => self::AUDIT_VERSION,
            'letter_audit_version' => self::LETTER_AUDIT_VERSION,
            'selected_filters' => [
                'fixture_set' => $fixtureSet,
                'task_type' => $taskType,
            ],
            'available_filters' => [
                'fixture_sets' => $availableFixtureSets,
                'task_types' => $availableTaskTypes,
            ],
            'summary' => [
                'attempts' => $attempts->count(),
                'exact_attempts' => $exactAttempts,
                'mismatched_attempts' => $attempts->count() - $exactAttempts,
                'expected_tokens' => $expectedTokens,
                'matched_tokens' => $matchedTokens,
                'substitutions' => $substitutions,
                'omissions' => $omissions,
                'insertions' => $insertions,
                'raw_token_accuracy' => $expectedTokens > 0
                    ? round($matchedTokens / $expectedTokens, 4)
                    : 0.0,
            ],
            'binary_classification' => $binaryClassifications['overall'],
            'binary_classifications' => $binaryClassifications,
            'labels' => [
                'expected' => $expectedLabels,
                'recognized' => $recognizedLabels,
            ],
            'cells' => $matrixCells,
            'confusions' => $confusions,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param  Collection<int, SpeechSandboxAttempt>  $allPositiveAttempts
     * @return array{overall: array<string, mixed>, content: array<string, mixed>, letter: array<string, mixed>}
     */
    private function rawBinaryClassifications(Collection $allPositiveAttempts): array
    {
        $allPositiveAttempts = $allPositiveAttempts
            ->filter(fn (SpeechSandboxAttempt $attempt): bool => $attempt->review_outcome === 'expected_correct')
            ->values();

        $contentPositiveAttempts = $allPositiveAttempts
            ->where('mode', SpeechSandboxAttempt::MODE_GENERAL)
            ->values();
        $letterPositiveAttempts = $allPositiveAttempts
            ->where('mode', SpeechSandboxAttempt::MODE_LETTER)
            ->values();
        $contentNegativeAttempts = $this->negativeAttempts(
            SpeechSandboxAttempt::MODE_GENERAL,
            self::NEGATIVE_AUDIT_VERSION,
        );
        $letterNegativeAttempts = $this->negativeAttempts(
            SpeechSandboxAttempt::MODE_LETTER,
            self::LETTER_NEGATIVE_AUDIT_VERSION,
        );

        return [
            'overall' => $this->rawBinaryClassification(
                $allPositiveAttempts,
                $contentNegativeAttempts->concat($letterNegativeAttempts)->values(),
                'overall',
                self::OVERALL_EVALUATION_VERSION,
                'content_raw_exact_and_letter_resolved',
            ),
            'content' => $this->rawBinaryClassification(
                $contentPositiveAttempts,
                $contentNegativeAttempts,
                'content',
                self::NEGATIVE_AUDIT_VERSION,
                'normalized_raw_exact_match',
            ),
            'letter' => $this->rawBinaryClassification(
                $letterPositiveAttempts,
                $letterNegativeAttempts,
                'letter',
                self::LETTER_NEGATIVE_AUDIT_VERSION,
                'current_letter_resolution',
            ),
        ];
    }

    /** @return Collection<int, SpeechSandboxAttempt> */
    private function negativeAttempts(string $mode, string $auditVersion): Collection
    {
        return SpeechSandboxAttempt::query()
            ->where('mode', $mode)
            ->where('service_status', 200)
            ->where('review_outcome', 'expected_wrong')
            ->orderBy('id')
            ->get()
            ->filter(fn (SpeechSandboxAttempt $attempt): bool => ($attempt->request_metadata['distractor_audit_version'] ?? null) === $auditVersion
                && ($attempt->request_metadata['ground_truth'] ?? null) === 'negative')
            ->values();
    }

    /**
     * @param  Collection<int, SpeechSandboxAttempt>  $positiveAttempts
     * @param  Collection<int, SpeechSandboxAttempt>  $negativeAttempts
     * @return array<string, mixed>
     */
    private function rawBinaryClassification(
        Collection $positiveAttempts,
        Collection $negativeAttempts,
        string $scope,
        string $evaluationVersion,
        string $acceptanceRule,
    ): array {

        $truePositives = $positiveAttempts->filter(
            fn (SpeechSandboxAttempt $attempt): bool => $this->binaryAccepted($attempt, $scope),
        )->count();
        $falseNegatives = $positiveAttempts->count() - $truePositives;
        $falsePositives = $negativeAttempts->filter(
            fn (SpeechSandboxAttempt $attempt): bool => $this->binaryAccepted($attempt, $scope),
        )->count();
        $trueNegatives = $negativeAttempts->count() - $falsePositives;
        $total = $positiveAttempts->count() + $negativeAttempts->count();

        $bySource = $negativeAttempts
            ->groupBy(fn (SpeechSandboxAttempt $attempt): string => (string) ($attempt->request_metadata['distractor_type'] ?? 'unknown'))
            ->map(function (Collection $attempts) use ($scope): array {
                $falsePositives = $attempts->filter(
                    fn (SpeechSandboxAttempt $attempt): bool => $this->binaryAccepted($attempt, $scope),
                )->count();

                return [
                    'attempts' => $attempts->count(),
                    'false_positives' => $falsePositives,
                    'true_negatives' => $attempts->count() - $falsePositives,
                ];
            })
            ->sortKeys()
            ->all();

        return [
            'scope' => $scope,
            'evaluation_version' => $evaluationVersion,
            'acceptance_rule' => $acceptanceRule,
            'positive_attempts' => $positiveAttempts->count(),
            'negative_attempts' => $negativeAttempts->count(),
            'true_positives' => $truePositives,
            'true_negatives' => $trueNegatives,
            'false_positives' => $falsePositives,
            'false_negatives' => $falseNegatives,
            'accuracy' => $this->ratio($truePositives + $trueNegatives, $total),
            'precision' => $this->ratio($truePositives, $truePositives + $falsePositives),
            'recall' => $this->ratio($truePositives, $truePositives + $falseNegatives),
            'specificity' => $this->ratio($trueNegatives, $trueNegatives + $falsePositives),
            'f1_score' => $this->ratio(2 * $truePositives, (2 * $truePositives) + $falsePositives + $falseNegatives),
            'false_positive_rate' => $this->ratio($falsePositives, $falsePositives + $trueNegatives),
            'false_negative_rate' => $this->ratio($falseNegatives, $falseNegatives + $truePositives),
            'negative_sources' => $bySource,
        ];
    }

    private function rawAccepted(SpeechSandboxAttempt $attempt): bool
    {
        return ($this->rawComparison($attempt)['exact_match'] ?? false) === true;
    }

    private function binaryAccepted(SpeechSandboxAttempt $attempt, string $scope): bool
    {
        if ($attempt->mode === SpeechSandboxAttempt::MODE_LETTER
            && in_array($scope, ['overall', 'letter'], true)) {
            return ($attempt->service_response['decision'] ?? null) === 'CORRECT'
                || $attempt->equivalence_rule_id !== null;
        }

        return $this->rawAccepted($attempt);
    }

    private function isFixtureAuditAttempt(SpeechSandboxAttempt $attempt): bool
    {
        $auditVersion = $attempt->request_metadata['fixture_audit_version'] ?? null;

        return ($attempt->mode === SpeechSandboxAttempt::MODE_GENERAL
                && in_array($auditVersion, [
                    self::AUDIT_VERSION,
                    self::LEGACY_CONTENT_AUDIT_VERSION,
                ], true))
            || ($attempt->mode === SpeechSandboxAttempt::MODE_LETTER
                && $auditVersion === self::LETTER_AUDIT_VERSION);
    }

    /** @return array{exact_match: bool, differences: list<array{status: string, expected: string, recognized: string}>} */
    private function rawComparison(SpeechSandboxAttempt $attempt): array
    {
        if ($attempt->mode !== SpeechSandboxAttempt::MODE_LETTER) {
            return $attempt->service_response['comparison'] ?? [
                'exact_match' => false,
                'differences' => [],
            ];
        }

        $expected = $this->normalize((string) $attempt->expected_value);
        $recognized = $this->normalize((string) (
            $attempt->service_response['normalized_transcript']
                ?? $attempt->service_response['raw_transcript']
                ?? ''
        ));
        $exact = $expected !== '' && $expected === $recognized;

        return [
            'exact_match' => $exact,
            'differences' => [[
                'status' => $exact ? 'match' : ($recognized === '' ? 'omission' : 'substitution'),
                'expected' => $expected,
                'recognized' => $recognized,
            ]],
        ];
    }

    private function ratio(int $numerator, int $denominator): float
    {
        return $denominator > 0 ? round($numerator / $denominator, 4) : 0.0;
    }

    /**
     * @param  Collection<int, SpeechSandboxAttempt>  $attempts
     * @return list<string>
     */
    private function availableValues(Collection $attempts, string $key): array
    {
        return $attempts
            ->map(fn (SpeechSandboxAttempt $attempt): ?string => $attempt->request_metadata[$key] ?? null)
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function token(mixed $value): string
    {
        $token = trim(mb_strtolower((string) $value));

        return $token === '' ? self::EMPTY_TOKEN : $token;
    }

    private function normalize(string $value): string
    {
        preg_match_all("/[a-z0-9']+/", mb_strtolower($value), $matches);

        return implode(' ', $matches[0]);
    }

    private function sortKey(string $token): string
    {
        return $token === self::EMPTY_TOKEN ? "\xFF" : $token;
    }
}
