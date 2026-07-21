<?php

namespace App\Services;

use RuntimeException;

final class SpeechContentCatalog
{
    /**
     * @return array{
     *     groups: array<int, array{key: string, label: string, source: string, activity_key: string, items: array<int, array<string, string>>}>,
     *     summary: array{total_items: int, assessment_items: int, lesson_items: int}
     * }
     */
    public function forTrueSandbox(): array
    {
        $groups = [
            $this->group(
                'assessment-task-2b',
                'Assessment · Task 2B Words',
                'assessment',
                'task-2b',
                'assessments/v1/shared/task-2b-words.csv',
                'word',
            ),
            $this->group(
                'assessment-task-3a',
                'Assessment · Task 3A Passages',
                'assessment',
                'task-3a',
                'assessments/v1/shared/task-3a-passages.csv',
                'passage',
                'title',
            ),
            $this->group(
                'lesson-2',
                'Lesson 2 · Words',
                'lesson',
                'required-lesson-2',
                'lessons/v1/lesson-2-word-items.csv',
                'word',
            ),
            $this->group(
                'lesson-3',
                'Lesson 3 · Phrases',
                'lesson',
                'required-lesson-3',
                'lessons/v1/lesson-3-phrases.csv',
                'phrase',
            ),
            $this->group(
                'lesson-4',
                'Lesson 4 · Sentences',
                'lesson',
                'required-lesson-4',
                'lessons/v1/lesson-4-sentences.csv',
                'sentence',
            ),
            $this->group(
                'lesson-5',
                'Lesson 5 · Passages',
                'lesson',
                'required-lesson-5',
                'lessons/v1/lesson-5-passages.csv',
                'passage',
                'title',
            ),
            $this->group(
                'lesson-6',
                'Lesson 6 · Comprehension Answers',
                'lesson',
                'required-lesson-6',
                'lessons/v1/lesson-6-comprehension.csv',
                'comprehension',
                'expected_answer',
            ),
        ];

        $assessmentItems = $this->countItems($groups, 'assessment');
        $lessonItems = $this->countItems($groups, 'lesson');

        return [
            'groups' => $groups,
            'summary' => [
                'total_items' => $assessmentItems + $lessonItems,
                'assessment_items' => $assessmentItems,
                'lesson_items' => $lessonItems,
            ],
        ];
    }

    /**
     * @return array{key: string, label: string, source: string, activity_key: string, items: array<int, array<string, string>>}
     */
    private function group(
        string $key,
        string $label,
        string $source,
        string $activityKey,
        string $relativePath,
        string $taskType,
        string $labelField = 'display_text',
    ): array {
        $rows = $this->readCsv($relativePath);
        $items = [];

        foreach ($rows as $row) {
            if (($row['status'] ?? '') !== 'active' || ($row['asr_model'] ?? '') !== 'mu') {
                continue;
            }

            $contentId = trim((string) ($row['content_id'] ?? ''));
            $expectedText = trim((string) ($row['spoken_target'] ?? ''));
            if ($contentId === '' || $expectedText === '') {
                throw new RuntimeException("Speech content {$relativePath} has an incomplete active row.");
            }

            $displayText = trim((string) ($row[$labelField] ?? $expectedText));
            $items[] = [
                'content_id' => $contentId,
                'item_key' => trim((string) ($row['item_key'] ?? $contentId)),
                'display_text' => $displayText,
                'expected_text' => $expectedText,
                'task_type' => $taskType,
            ];
        }

        return [
            'key' => $key,
            'label' => $label,
            'source' => $source,
            'activity_key' => $activityKey,
            'items' => $items,
        ];
    }

    /** @return array<int, array<string, string>> */
    private function readCsv(string $relativePath): array
    {
        $path = base_path('../../content/'.$relativePath);
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException("Speech content file is unavailable: {$relativePath}");
        }

        try {
            $headers = fgetcsv($stream, escape: '');
            if ($headers === false) {
                throw new RuntimeException("Speech content file has no header: {$relativePath}");
            }

            $rows = [];
            while (($values = fgetcsv($stream, escape: '')) !== false) {
                if ($values === [null] || $values === []) {
                    continue;
                }
                if (count($headers) !== count($values)) {
                    throw new RuntimeException("Speech content row has the wrong column count: {$relativePath}");
                }
                $rows[] = array_combine($headers, $values);
            }

            return $rows;
        } finally {
            fclose($stream);
        }
    }

    /**
     * @param  array<int, array{source: string, items: array<int, array<string, string>>}>  $groups
     */
    private function countItems(array $groups, string $source): int
    {
        return array_sum(array_map(
            fn (array $group): int => $group['source'] === $source ? count($group['items']) : 0,
            $groups,
        ));
    }
}
