<?php

namespace App\Services;

use Illuminate\Support\Collection;

final class SpeechConfusionMatrix
{
    public const AUDIT_VERSION = BundledSpeechAuditSource::CONTENT_AUDIT_VERSION;

    public const LEGACY_CONTENT_AUDIT_VERSION = 'two-voice-item-token-v1';

    public const LETTER_AUDIT_VERSION = BundledSpeechAuditSource::LETTER_AUDIT_VERSION;

    public const NEGATIVE_AUDIT_VERSION = BundledSpeechAuditSource::CONTENT_NEGATIVE_AUDIT_VERSION;

    public const LETTER_NEGATIVE_AUDIT_VERSION = BundledSpeechAuditSource::LETTER_NEGATIVE_AUDIT_VERSION;

    public const OVERALL_EVALUATION_VERSION = 'content-and-letter-distractor-raw-v1';

    public const EMPTY_TOKEN = '__none__';

    public function __construct(private readonly BundledSpeechAuditSource $audits) {}

    /**
     * @return array<string, mixed>
     */
    public function raw(?string $fixtureSource = null, ?string $taskType = null): array
    {
        $allAttempts = collect($this->audits->positiveAttempts());
        $internalFixtureSet = $fixtureSource !== null
            ? $this->audits->internalFixtureSetForSource($fixtureSource)
            : null;
        $availableTaskTypes = $this->availableValues($allAttempts, 'task_type');
        $attempts = $allAttempts
            ->when($internalFixtureSet !== null, fn (Collection $items): Collection => $items->where(
                'fixture_set',
                $internalFixtureSet,
            ))
            ->when($taskType !== null, fn (Collection $items): Collection => $items->where(
                'task_type',
                $taskType,
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
            if ($attempt['raw_exact']) {
                $exactAttempts++;
            }

            foreach ($this->compareTokens($attempt['expected'], $attempt['recognized']) as $difference) {
                $status = $difference['status'];
                $expected = $this->token($difference['expected']);
                $recognized = $this->token($difference['recognized']);
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

        $binaryClassifications = $this->rawBinaryClassifications(
            $allAttempts,
            collect($this->audits->negativeAttempts()),
        );

        return [
            'mode' => 'raw',
            'source' => 'bundled_fixture_audits',
            'source_versions' => $this->audits->versions(),
            'fixture_sources' => $this->audits->provenance(),
            'audit_version' => self::AUDIT_VERSION,
            'letter_audit_version' => self::LETTER_AUDIT_VERSION,
            'selected_filters' => [
                'fixture_source' => $fixtureSource,
                'task_type' => $taskType,
            ],
            'available_filters' => [
                'fixture_sources' => BundledSpeechAuditSource::fixtureSourceIds(),
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
     * @param  Collection<int, array<string, mixed>>  $positiveAttempts
     * @param  Collection<int, array<string, mixed>>  $negativeAttempts
     * @return array{overall: array<string, mixed>, content: array<string, mixed>, letter: array<string, mixed>}
     */
    private function rawBinaryClassifications(
        Collection $positiveAttempts,
        Collection $negativeAttempts,
    ): array {
        $contentPositiveAttempts = $positiveAttempts->where('scope', 'content')->values();
        $letterPositiveAttempts = $positiveAttempts->where('scope', 'letter')->values();
        $contentNegativeAttempts = $negativeAttempts->where('scope', 'content')->values();
        $letterNegativeAttempts = $negativeAttempts->where('scope', 'letter')->values();

        return [
            'overall' => $this->rawBinaryClassification(
                $positiveAttempts,
                $negativeAttempts,
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

    /**
     * @param  Collection<int, array<string, mixed>>  $positiveAttempts
     * @param  Collection<int, array<string, mixed>>  $negativeAttempts
     * @return array<string, mixed>
     */
    private function rawBinaryClassification(
        Collection $positiveAttempts,
        Collection $negativeAttempts,
        string $scope,
        string $evaluationVersion,
        string $acceptanceRule,
    ): array {
        $truePositives = $positiveAttempts->where('accepted', true)->count();
        $falseNegatives = $positiveAttempts->count() - $truePositives;
        $falsePositives = $negativeAttempts->where('accepted', true)->count();
        $trueNegatives = $negativeAttempts->count() - $falsePositives;
        $total = $positiveAttempts->count() + $negativeAttempts->count();

        $bySource = $negativeAttempts
            ->groupBy('source')
            ->map(function (Collection $attempts): array {
                $falsePositives = $attempts->where('accepted', true)->count();

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

    /**
     * Reproduces the ASR audit's word-level LCS alignment and merges adjacent
     * insertion/omission pairs into substitutions.
     *
     * @return list<array{status: string, expected: string, recognized: string}>
     */
    private function compareTokens(string $expected, string $recognized): array
    {
        $expectedTokens = $expected === '' ? [] : explode(' ', $expected);
        $recognizedTokens = $recognized === '' ? [] : explode(' ', $recognized);
        $expectedCount = count($expectedTokens);
        $recognizedCount = count($recognizedTokens);
        $table = array_fill(0, $expectedCount + 1, array_fill(0, $recognizedCount + 1, 0));

        for ($left = 1; $left <= $expectedCount; $left++) {
            for ($right = 1; $right <= $recognizedCount; $right++) {
                $table[$left][$right] = $expectedTokens[$left - 1] === $recognizedTokens[$right - 1]
                    ? $table[$left - 1][$right - 1] + 1
                    : max($table[$left - 1][$right], $table[$left][$right - 1]);
            }
        }

        $differences = [];
        $left = $expectedCount;
        $right = $recognizedCount;
        while ($left > 0 || $right > 0) {
            if ($left > 0
                && $right > 0
                && $expectedTokens[$left - 1] === $recognizedTokens[$right - 1]) {
                $differences[] = [
                    'status' => 'match',
                    'expected' => $expectedTokens[$left - 1],
                    'recognized' => $recognizedTokens[$right - 1],
                ];
                $left--;
                $right--;
            } elseif ($right > 0
                && ($left === 0 || $table[$left][$right - 1] >= $table[$left - 1][$right])) {
                $differences[] = [
                    'status' => 'insertion',
                    'expected' => '',
                    'recognized' => $recognizedTokens[$right - 1],
                ];
                $right--;
            } else {
                $differences[] = [
                    'status' => 'omission',
                    'expected' => $expectedTokens[$left - 1],
                    'recognized' => '',
                ];
                $left--;
            }
        }

        return $this->mergeSubstitutions(array_reverse($differences));
    }

    /**
     * @param  list<array{status: string, expected: string, recognized: string}>  $differences
     * @return list<array{status: string, expected: string, recognized: string}>
     */
    private function mergeSubstitutions(array $differences): array
    {
        $merged = [];
        for ($index = 0, $count = count($differences); $index < $count; $index++) {
            $current = $differences[$index];
            $following = $differences[$index + 1] ?? null;
            if ($following !== null
                && in_array($current['status'], ['insertion', 'omission'], true)
                && in_array($following['status'], ['insertion', 'omission'], true)
                && $current['status'] !== $following['status']) {
                $insertion = $current['status'] === 'insertion' ? $current : $following;
                $omission = $current['status'] === 'omission' ? $current : $following;
                $merged[] = [
                    'status' => 'substitution',
                    'expected' => $omission['expected'],
                    'recognized' => $insertion['recognized'],
                ];
                $index++;
            } else {
                $merged[] = $current;
            }
        }

        return $merged;
    }

    private function ratio(int $numerator, int $denominator): float
    {
        return $denominator > 0 ? round($numerator / $denominator, 4) : 0.0;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $attempts
     * @return list<string>
     */
    private function availableValues(Collection $attempts, string $key): array
    {
        return $attempts
            ->pluck($key)
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

    private function sortKey(string $token): string
    {
        return $token === self::EMPTY_TOKEN ? "\xFF" : $token;
    }
}
