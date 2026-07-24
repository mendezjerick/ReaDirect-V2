<?php

namespace App\Services;

final class TranscriptAlignmentService
{
    /**
     * Calculate a deterministic word-level Levenshtein alignment.
     *
     * @return array<string, mixed>
     */
    public function analyze(string $expected, string $actual): array
    {
        $expectedTokens = $this->tokens($expected);
        $actualTokens = $this->tokens($actual);

        if ($expectedTokens === $actualTokens) {
            return [
                'algorithm' => 'word_levenshtein_v1',
                'diagnosis_key' => 'correct_phrase',
                'distance' => 0,
                'similarity' => 1.0,
                'expected_tokens' => $expectedTokens,
                'actual_tokens' => $actualTokens,
                'operations' => [],
                'primary_operation' => null,
            ];
        }

        $transposition = $this->adjacentTransposition(
            $expectedTokens,
            $actualTokens,
        );
        if ($transposition !== null) {
            return [
                'algorithm' => 'word_levenshtein_v1',
                'diagnosis_key' => 'words_out_of_order',
                'distance' => 1,
                'similarity' => $this->similarity(
                    1,
                    count($expectedTokens),
                    count($actualTokens),
                ),
                'expected_tokens' => $expectedTokens,
                'actual_tokens' => $actualTokens,
                'operations' => [$transposition],
                'primary_operation' => $transposition,
            ];
        }

        [$distance, $operations] = $this->levenshteinOperations(
            $expectedTokens,
            $actualTokens,
        );
        $differences = array_values(array_filter(
            $operations,
            fn (array $operation): bool => $operation['type'] !== 'match',
        ));
        $diagnosisKey = $this->diagnosisKey($differences);

        return [
            'algorithm' => 'word_levenshtein_v1',
            'diagnosis_key' => $diagnosisKey,
            'distance' => $distance,
            'similarity' => $this->similarity(
                $distance,
                count($expectedTokens),
                count($actualTokens),
            ),
            'expected_tokens' => $expectedTokens,
            'actual_tokens' => $actualTokens,
            'operations' => $differences,
            'primary_operation' => $differences[0] ?? null,
        ];
    }

    /**
     * @param  list<string>  $expected
     * @param  list<string>  $actual
     * @return array{int, list<array<string, int|string|float>>}
     */
    private function levenshteinOperations(
        array $expected,
        array $actual,
    ): array {
        $expectedCount = count($expected);
        $actualCount = count($actual);
        $matrix = array_fill(
            0,
            $expectedCount + 1,
            array_fill(0, $actualCount + 1, 0),
        );

        for ($expectedIndex = 0; $expectedIndex <= $expectedCount; $expectedIndex++) {
            $matrix[$expectedIndex][0] = $expectedIndex;
        }
        for ($actualIndex = 0; $actualIndex <= $actualCount; $actualIndex++) {
            $matrix[0][$actualIndex] = $actualIndex;
        }

        for ($expectedIndex = 1; $expectedIndex <= $expectedCount; $expectedIndex++) {
            for ($actualIndex = 1; $actualIndex <= $actualCount; $actualIndex++) {
                $substitutionCost = $expected[$expectedIndex - 1]
                    === $actual[$actualIndex - 1] ? 0 : 1;
                $matrix[$expectedIndex][$actualIndex] = min(
                    $matrix[$expectedIndex - 1][$actualIndex] + 1,
                    $matrix[$expectedIndex][$actualIndex - 1] + 1,
                    $matrix[$expectedIndex - 1][$actualIndex - 1]
                        + $substitutionCost,
                );
            }
        }

        $operations = [];
        $expectedIndex = $expectedCount;
        $actualIndex = $actualCount;

        while ($expectedIndex > 0 || $actualIndex > 0) {
            if (
                $expectedIndex > 0
                && $actualIndex > 0
                && $expected[$expectedIndex - 1] === $actual[$actualIndex - 1]
                && $matrix[$expectedIndex][$actualIndex]
                    === $matrix[$expectedIndex - 1][$actualIndex - 1]
            ) {
                $operations[] = [
                    'type' => 'match',
                    'expected' => $expected[$expectedIndex - 1],
                    'actual' => $actual[$actualIndex - 1],
                    'expected_index' => $expectedIndex - 1,
                    'actual_index' => $actualIndex - 1,
                ];
                $expectedIndex--;
                $actualIndex--;

                continue;
            }

            if (
                $expectedIndex > 0
                && $actualIndex > 0
                && $matrix[$expectedIndex][$actualIndex]
                    === $matrix[$expectedIndex - 1][$actualIndex - 1] + 1
            ) {
                $expectedWord = $expected[$expectedIndex - 1];
                $actualWord = $actual[$actualIndex - 1];
                $operations[] = [
                    'type' => 'substitute',
                    'expected' => $expectedWord,
                    'actual' => $actualWord,
                    'expected_index' => $expectedIndex - 1,
                    'actual_index' => $actualIndex - 1,
                    'character_distance' => levenshtein(
                        $expectedWord,
                        $actualWord,
                    ),
                ];
                $expectedIndex--;
                $actualIndex--;

                continue;
            }

            if (
                $expectedIndex > 0
                && $matrix[$expectedIndex][$actualIndex]
                    === $matrix[$expectedIndex - 1][$actualIndex] + 1
            ) {
                $operations[] = [
                    'type' => 'delete',
                    'expected' => $expected[$expectedIndex - 1],
                    'expected_index' => $expectedIndex - 1,
                    'actual_index' => $actualIndex,
                ];
                $expectedIndex--;

                continue;
            }

            $operations[] = [
                'type' => 'insert',
                'actual' => $actual[$actualIndex - 1],
                'expected_index' => $expectedIndex,
                'actual_index' => $actualIndex - 1,
            ];
            $actualIndex--;
        }

        return [
            $matrix[$expectedCount][$actualCount],
            array_reverse($operations),
        ];
    }

    /**
     * @param  list<string>  $expected
     * @param  list<string>  $actual
     * @return array<string, int|string>|null
     */
    private function adjacentTransposition(
        array $expected,
        array $actual,
    ): ?array {
        if (count($expected) !== count($actual)) {
            return null;
        }

        $different = [];
        foreach ($expected as $index => $word) {
            if ($word !== $actual[$index]) {
                $different[] = $index;
            }
        }

        if (
            count($different) !== 2
            || $different[1] !== $different[0] + 1
            || $expected[$different[0]] !== $actual[$different[1]]
            || $expected[$different[1]] !== $actual[$different[0]]
        ) {
            return null;
        }

        return [
            'type' => 'transpose',
            'expected_first' => $expected[$different[0]],
            'expected_second' => $expected[$different[1]],
            'expected_index' => $different[0],
            'actual_index' => $different[0],
        ];
    }

    /**
     * @param  list<array<string, int|string|float>>  $operations
     */
    private function diagnosisKey(array $operations): string
    {
        if (count($operations) !== 1) {
            return 'multiple_word_differences';
        }

        return match ($operations[0]['type']) {
            'delete' => 'missing_word',
            'insert' => 'extra_word',
            'substitute' => 'replaced_word',
            default => 'multiple_word_differences',
        };
    }

    private function similarity(
        int $distance,
        int $expectedCount,
        int $actualCount,
    ): float {
        $length = max($expectedCount, $actualCount);

        return $length === 0
            ? 1.0
            : round(max(0, 1 - ($distance / $length)), 4);
    }

    /** @return list<string> */
    private function tokens(string $value): array
    {
        $normalized = mb_strtolower(trim($value));
        $normalized = preg_replace(
            "/[^\\p{L}\\p{N}']+/u",
            ' ',
            $normalized,
        ) ?? '';

        return array_values(array_filter(
            preg_split('/\s+/u', trim($normalized)) ?: [],
            fn (string $token): bool => $token !== '',
        ));
    }
}
