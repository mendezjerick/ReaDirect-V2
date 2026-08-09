<?php

namespace App\Services;

use RuntimeException;

final class FilipinoTtsAudioReviewSource
{
    private const HEADERS = [
        'batch_id',
        'speech_key',
        'reference_role',
        'source_review_status',
        'audio_review_status',
        'english_text',
        'filipino_text',
        'staged_audio_path',
        'duration_seconds',
        'sha256',
        'review_notes',
    ];

    private const REVIEW_STATUSES = [
        'pending',
        'approved',
        'rejected',
    ];

    public function __construct(
        private readonly FilipinoTtsCatalogSource $catalogSource,
        private readonly ?string $reviewDirectoryOverride = null,
    ) {}

    /**
     * @return array<string, array<string, string>>
     */
    public function rows(): array
    {
        $paths = glob($this->reviewDirectory().'/batch-*.csv');
        if (! is_array($paths) || $paths === []) {
            throw new RuntimeException('Filipino TTS audio review manifests are missing.');
        }
        sort($paths, SORT_STRING);

        $sourceLines = $this->catalogSource->lines();
        $rows = [];
        foreach ($paths as $path) {
            $batchId = pathinfo($path, PATHINFO_FILENAME);
            foreach ($this->readCsv($path) as $row) {
                $speechKey = $row['speech_key'];
                $sourceLine = $sourceLines[$speechKey] ?? null;
                if (! is_array($sourceLine) || isset($rows[$speechKey])) {
                    throw new RuntimeException(
                        "Invalid or duplicate Filipino audio review key: {$speechKey}",
                    );
                }
                if ($row['batch_id'] !== $batchId
                    || ! in_array(
                        $row['audio_review_status'],
                        self::REVIEW_STATUSES,
                        true,
                    )
                    || $row['source_review_status'] !== $sourceLine['review_status']
                    || $row['reference_role'] !== $sourceLine['reference_role']
                    || $row['english_text'] !== $sourceLine['english_text']
                    || $row['filipino_text'] !== $sourceLine['filipino_text']
                    || $row['staged_audio_path'] !== $this->stagedPath($sourceLine['audio_path'])
                    || ! is_numeric($row['duration_seconds'])
                    || (float) $row['duration_seconds'] <= 0
                    || preg_match('/^[a-f0-9]{64}$/', $row['sha256']) !== 1
                    || $row['review_notes'] === '') {
                    throw new RuntimeException(
                        "Invalid Filipino audio review row: {$speechKey}",
                    );
                }

                $rows[$speechKey] = $row;
            }
        }

        if (array_keys($rows) !== array_keys($sourceLines)) {
            throw new RuntimeException(
                'Filipino TTS audio review manifests must cover all 300 source lines in catalog order.',
            );
        }

        return $rows;
    }

    /**
     * @return array{
     *     review_ready: bool,
     *     total_lines: int,
     *     review_counts: array<string, int>
     * }
     */
    public function audit(): array
    {
        $counts = array_fill_keys(self::REVIEW_STATUSES, 0);
        foreach ($this->rows() as $row) {
            $counts[$row['audio_review_status']]++;
        }

        return [
            'review_ready' => $counts['approved'] === 300,
            'total_lines' => array_sum($counts),
            'review_counts' => $counts,
        ];
    }

    /** @return array<string, array<string, string>> */
    public function approvedRows(): array
    {
        $rows = $this->rows();
        $unapproved = array_filter(
            $rows,
            fn (array $row): bool => $row['audio_review_status'] !== 'approved',
        );
        if ($unapproved !== []) {
            throw new RuntimeException(sprintf(
                'Filipino TTS audio review is blocked: %d lines are not approved.',
                count($unapproved),
            ));
        }

        return $rows;
    }

    /** @return list<array<string, string>> */
    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException("Cannot open Filipino audio review manifest: {$path}");
        }

        try {
            $headers = fgetcsv($handle);
            if ($headers !== self::HEADERS) {
                throw new RuntimeException("Invalid Filipino audio review headers: {$path}");
            }

            $rows = [];
            while (($values = fgetcsv($handle)) !== false) {
                if (count($values) !== count($headers)) {
                    throw new RuntimeException("Invalid Filipino audio review row: {$path}");
                }
                $row = array_combine($headers, $values);
                if (! is_array($row)) {
                    throw new RuntimeException("Invalid Filipino audio review row: {$path}");
                }
                $rows[] = $row;
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }

    private function reviewDirectory(): string
    {
        return $this->reviewDirectoryOverride
            ?? dirname(__DIR__, 4).'/content/tts/v1/fil-PH/review-batches';
    }

    private function stagedPath(string $audioPath): string
    {
        return 'apps/api/storage/app/private/tts/staging/fil-PH-v1/sh-fil/'
            .$audioPath;
    }
}
