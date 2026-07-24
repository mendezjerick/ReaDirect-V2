<?php

namespace App\Services;

final class PassageReadingResultService
{
    /**
     * @param  array<string, mixed>  $evidence
     * @param  array<string, mixed>  $resolution
     * @return array<string, int|float|null>
     */
    public function metrics(
        array $evidence,
        array $resolution,
        int $incorrectWords,
    ): array {
        $segments = collect($evidence['segments'] ?? [])
            ->filter(fn (mixed $segment): bool => is_array($segment)
                && is_numeric($segment['start'] ?? null)
                && is_numeric($segment['end'] ?? null)
                && (float) $segment['end'] > (float) $segment['start']);
        $readingSeconds = null;

        if ($segments->isNotEmpty()) {
            $firstSpeech = (float) $segments->min(
                fn (array $segment): float => (float) $segment['start'],
            );
            $lastSpeech = (float) $segments->max(
                fn (array $segment): float => (float) $segment['end'],
            );
            $readingSeconds = $lastSpeech - $firstSpeech;
        }

        if ($readingSeconds === null || $readingSeconds <= 0) {
            $duration = data_get($evidence, 'audio_quality.duration_seconds');
            $readingSeconds = is_numeric($duration) && (float) $duration > 0
                ? (float) $duration
                : null;
        }

        $expectedWords = (int) ($resolution['expected_word_count'] ?? 0);
        $recognizedWords = (int) ($resolution['recognized_word_count'] ?? 0);
        $correctWords = max(0, $expectedWords - $incorrectWords);

        return [
            'recognized_word_count' => $recognizedWords,
            'correct_word_count' => $correctWords,
            'reading_seconds' => $readingSeconds === null
                ? null
                : round($readingSeconds, 1),
            'words_per_minute' => $readingSeconds === null
                ? null
                : (int) round(($recognizedWords * 60) / max(0.1, $readingSeconds)),
            'correct_words_per_minute' => $readingSeconds === null
                ? null
                : (int) round(($correctWords * 60) / max(0.1, $readingSeconds)),
        ];
    }

    /**
     * @param  array<string, mixed>  $passage
     * @param  array<string, mixed>|null  $evidence
     * @return array<string, mixed>
     */
    public function review(
        array $passage,
        ?array $evidence,
        ?string $responseType,
    ): array {
        $skipped = $responseType === 'skipped';
        $differences = collect(data_get(
            $evidence,
            'equivalence_resolution.differences',
            [],
        ));
        $expectedDifferences = $differences
            ->filter(fn (mixed $difference): bool => is_array($difference)
                && trim((string) ($difference['expected'] ?? '')) !== '')
            ->values();
        $displayWords = preg_split(
            '/\s+/u',
            trim((string) ($passage['display_text'] ?? '')),
            flags: PREG_SPLIT_NO_EMPTY,
        ) ?: [];
        $reviewAvailable = ! $skipped
            && $evidence !== null
            && $expectedDifferences->isNotEmpty()
            && $expectedDifferences->count() === count($displayWords);

        $words = collect($displayWords)
            ->map(function (
                string $word,
                int $index,
            ) use ($expectedDifferences, $reviewAvailable): array {
                $difference = $reviewAvailable
                    ? $expectedDifferences->get($index)
                    : null;
                $sourceStatus = is_array($difference)
                    ? (string) ($difference['status'] ?? '')
                    : '';
                $status = match ($sourceStatus) {
                    'match', 'equivalent' => 'correct',
                    'omission' => 'missed',
                    'substitution' => 'replaced',
                    default => 'unscored',
                };

                return [
                    'text' => $word,
                    'status' => $status,
                    'heard' => $status === 'replaced'
                        ? (string) ($difference['recognized'] ?? '')
                        : null,
                ];
            })
            ->values()
            ->all();
        $extraWords = $reviewAvailable
            ? $differences
                ->filter(fn (mixed $difference): bool => is_array($difference)
                    && ($difference['status'] ?? '') === 'insertion'
                    && trim((string) ($difference['recognized'] ?? '')) !== '')
                ->pluck('recognized')
                ->map(fn (mixed $word): string => (string) $word)
                ->values()
                ->all()
            : [];

        return [
            'title' => (string) ($passage['title'] ?? 'Your story'),
            'skipped' => $skipped,
            'review_available' => $reviewAvailable,
            'performance_band' => $this->performanceBand(
                $skipped,
                data_get($evidence, 'scoring.reading_accuracy_percent'),
            ),
            'reading_accuracy_percent' => data_get(
                $evidence,
                'scoring.reading_accuracy_percent',
            ),
            'reading_seconds' => data_get($evidence, 'scoring.reading_seconds'),
            'words_per_minute' => data_get($evidence, 'scoring.words_per_minute'),
            'correct_words_per_minute' => data_get(
                $evidence,
                'scoring.correct_words_per_minute',
            ),
            'words' => $words,
            'extra_words' => $extraWords,
        ];
    }

    private function performanceBand(
        bool $skipped,
        mixed $accuracy,
    ): string {
        if ($skipped) {
            return 'skipped';
        }

        if (! is_numeric($accuracy)) {
            return 'unavailable';
        }

        return match (true) {
            (float) $accuracy >= 90 => 'excellent',
            (float) $accuracy >= 75 => 'strong',
            (float) $accuracy >= 50 => 'growing',
            default => 'beginning',
        };
    }
}
