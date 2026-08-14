<?php

namespace App\Services;

use RuntimeException;

final class WordRescuePresentationCatalog
{
    private const EXPECTED_ACTIVE_COUNT = 49;

    /** @var list<string> */
    private const PRESENTATION_HEADERS = [
        'content_id',
        'visual_kind',
        'visual_key',
        'visual_review_status',
        'visual_asset_status',
        'missing_letter_index',
        'missing_letter_distractor_1',
        'missing_letter_distractor_2',
        'build_word_enabled',
        'missing_word_enabled',
        'missing_word_occurrence',
        'picture_find_enabled',
        'word_picture_match_enabled',
        'alt_text',
        'visual_disambiguation_note',
        'mechanic_notes',
        'review_status',
    ];

    /** @var list<string> */
    private const LESSON_HEADERS = [
        'status',
        'content_id',
        'display_text',
        'context_sentence',
        'highlighted_word',
        'highlight_occurrence',
    ];

    private ?array $validatedRows = null;

    public function __construct(
        private readonly ?string $presentationPath = null,
        private readonly ?string $lessonPath = null,
    ) {}

    public function validate(): void
    {
        $this->validatedRows();
    }

    /** @return list<array<string, string>> */
    public function all(): array
    {
        return array_values($this->validatedRows());
    }

    /** @return array<string, string> */
    public function forContentId(string $contentId): array
    {
        $row = $this->validatedRows()[$contentId] ?? null;
        if ($row === null) {
            throw new RuntimeException("Word Rescue presentation is unavailable: {$contentId}");
        }

        return $row;
    }

    /** @return array<string, array<string, string>> */
    private function validatedRows(): array
    {
        if ($this->validatedRows !== null) {
            return $this->validatedRows;
        }

        $lessonRows = $this->readLessonRows();
        if (count($lessonRows) !== self::EXPECTED_ACTIVE_COUNT) {
            throw new RuntimeException('Word Rescue requires exactly 49 active Lesson 2 words.');
        }

        $presentationRows = $this->readCsv(
            $this->presentationPath ?? base_path('../../content/lessons/v1/word-rescue-presentations.csv'),
            self::PRESENTATION_HEADERS,
            'Word Rescue presentation catalog',
            allowedEmptyHeaders: ['visual_key', 'alt_text'],
        );

        $validated = [];
        foreach ($presentationRows as $rowIndex => $row) {
            $contentId = $row['content_id'];
            if (isset($validated[$contentId])) {
                throw new RuntimeException("Word Rescue presentation row {$rowIndex} duplicates {$contentId}.");
            }
            if (! isset($lessonRows[$contentId])) {
                throw new RuntimeException("Word Rescue presentation references unknown Lesson 2 content: {$contentId}.");
            }

            $this->validateRow($row, $lessonRows[$contentId], $lessonRows, $rowIndex);
            $validated[$contentId] = $row;
        }

        $missing = array_diff_key($lessonRows, $validated);
        if ($missing !== []) {
            throw new RuntimeException(
                'Word Rescue presentation catalog is missing: '.implode(', ', array_keys($missing)).'.',
            );
        }

        return $this->validatedRows = $validated;
    }

    /** @return array<string, array<string, string>> */
    private function readLessonRows(): array
    {
        $rows = $this->readCsv(
            $this->lessonPath ?? base_path('../../content/lessons/v1/lesson-2-word-items.csv'),
            self::LESSON_HEADERS,
            'Lesson 2 word content',
            exactHeaders: false,
        );
        $active = [];

        foreach ($rows as $rowIndex => $row) {
            if ($row['status'] !== 'active') {
                continue;
            }
            if (isset($active[$row['content_id']])) {
                throw new RuntimeException("Lesson 2 word content row {$rowIndex} duplicates {$row['content_id']}.");
            }
            $active[$row['content_id']] = $row;
        }

        return $active;
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<string, string>  $lessonRow
     * @param  array<string, array<string, string>>  $lessonRows
     */
    private function validateRow(array $row, array $lessonRow, array $lessonRows, int $rowIndex): void
    {
        $id = $row['content_id'];
        $word = strtolower($lessonRow['display_text']);
        $context = $lessonRow['context_sentence'];
        $prefix = "Word Rescue presentation {$id} (row {$rowIndex})";

        if (! preg_match('/^lesson-v1-word-[a-z]+$/', $id)) {
            throw new RuntimeException("{$prefix} has an unsafe content ID.");
        }
        if (! preg_match('/^[a-z]{3}$/', $word)) {
            throw new RuntimeException("{$prefix} requires a three-letter lowercase Lesson 2 word.");
        }
        if (! preg_match('/^[12]$/', $row['missing_letter_index']) || $row['missing_letter_index'] !== '2') {
            throw new RuntimeException("{$prefix} must use missing_letter_index 2.");
        }

        $index = (int) $row['missing_letter_index'] - 1;
        $correctLetter = $word[$index];
        foreach (['missing_letter_distractor_1', 'missing_letter_distractor_2'] as $field) {
            if (! preg_match('/^[a-z]$/', $row[$field]) || $row[$field] === $correctLetter) {
                throw new RuntimeException("{$prefix} has an invalid missing-letter distractor.");
            }
        }
        if ($row['missing_letter_distractor_1'] === $row['missing_letter_distractor_2']) {
            throw new RuntimeException("{$prefix} repeats a missing-letter distractor.");
        }

        foreach (['missing_letter_distractor_1', 'missing_letter_distractor_2'] as $field) {
            $candidate = substr_replace($word, $row[$field], $index, 1);
            foreach ($lessonRows as $otherLessonRow) {
                if (strtolower($otherLessonRow['display_text']) === $candidate) {
                    throw new RuntimeException("{$prefix} distractor reconstructs approved target {$candidate}.");
                }
            }
        }

        $visualKind = $row['visual_kind'];
        if (! in_array($visualKind, ['image', 'icon', 'none'], true)) {
            throw new RuntimeException("{$prefix} has an unsupported visual kind.");
        }
        $hasVisual = $visualKind !== 'none';
        if ($hasVisual) {
            if (! preg_match('/^word-[a-z]+$/', $row['visual_key'])) {
                throw new RuntimeException("{$prefix} has an unsafe visual key.");
            }
            if ($row['visual_review_status'] !== 'approved'
                || $row['visual_asset_status'] !== 'planned'
                || trim($row['alt_text']) === ''
            ) {
                throw new RuntimeException("{$prefix} visual metadata is not approved for Phase 1A.");
            }
        } elseif ($row['visual_key'] !== ''
            || $row['visual_review_status'] !== 'not-applicable'
            || $row['visual_asset_status'] !== 'not-required'
            || $row['alt_text'] !== ''
        ) {
            throw new RuntimeException("{$prefix} text-only visual metadata is invalid.");
        }

        foreach (['build_word_enabled', 'missing_word_enabled', 'picture_find_enabled', 'word_picture_match_enabled'] as $field) {
            if (! in_array($row[$field], ['true', 'false'], true)) {
                throw new RuntimeException("{$prefix} has an invalid {$field} flag.");
            }
        }
        if ($row['build_word_enabled'] !== 'true' || $row['missing_word_enabled'] !== 'true') {
            throw new RuntimeException("{$prefix} must enable Build Word and Missing Word.");
        }
        if (($row['picture_find_enabled'] === 'true') !== $hasVisual) {
            throw new RuntimeException("{$prefix} picture-find availability does not match its visual kind.");
        }
        if ($row['word_picture_match_enabled'] !== 'false') {
            throw new RuntimeException("{$prefix} must keep Word/Picture Match disabled in Phase 1A.");
        }

        if (! preg_match('/^[1-9][0-9]*$/', $row['missing_word_occurrence'])) {
            throw new RuntimeException("{$prefix} has an invalid sentence occurrence.");
        }
        $occurrence = (int) $row['missing_word_occurrence'];
        if ($occurrence !== (int) $lessonRow['highlight_occurrence']
            || strcasecmp($lessonRow['highlighted_word'], $word) !== 0
            || $this->wordOccurrenceCount($context, $word) !== $occurrence
        ) {
            throw new RuntimeException("{$prefix} does not match the approved sentence occurrence.");
        }

        if (trim($row['visual_disambiguation_note']) === ''
            || trim($row['mechanic_notes']) === ''
            || $row['review_status'] !== 'phase-1a-reviewed'
        ) {
            throw new RuntimeException("{$prefix} is missing Phase 1A review metadata.");
        }
    }

    private function wordOccurrenceCount(string $sentence, string $word): int
    {
        $matched = preg_match_all(
            '/(?<![a-z])'.preg_quote($word, '/').'(?![a-z])/i',
            $sentence,
        );

        return $matched === false ? 0 : $matched;
    }

    /**
     * @param  list<string>  $expectedHeaders
     * @return list<array<string, string>>
     */
    private function readCsv(
        string $path,
        array $expectedHeaders,
        string $label,
        bool $exactHeaders = true,
        array $allowedEmptyHeaders = [],
    ): array {
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException("{$label} is unavailable: {$path}");
        }

        try {
            $headers = fgetcsv($stream, 0, ',', '"', '');
            $headersValid = $exactHeaders
                ? $headers === $expectedHeaders
                : is_array($headers) && count(array_diff($expectedHeaders, $headers)) === 0;
            if (! $headersValid) {
                throw new RuntimeException("{$label} headers are invalid.");
            }

            $rows = [];
            while (($values = fgetcsv($stream, 0, ',', '"', '')) !== false) {
                if ($values === [null] || count($values) !== count($headers)) {
                    throw new RuntimeException("{$label} contains a malformed row.");
                }
                $row = array_combine($headers, $values);
                if ($row === false) {
                    throw new RuntimeException("{$label} contains an incomplete row.");
                }
                foreach ($row as $field => $value) {
                    if (trim($value) === '' && ! in_array($field, $allowedEmptyHeaders, true)) {
                        throw new RuntimeException("{$label} contains an incomplete row.");
                    }
                }
                $rows[] = $row;
            }

            return $rows;
        } finally {
            fclose($stream);
        }
    }
}
