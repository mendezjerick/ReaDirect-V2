<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

final class OfflinePracticeSourceResolver
{
    /** @var array<string, array{path: string, kind: string}> */
    private const DATASETS = [
        'letters' => ['path' => 'lesson-1-letter-items.csv', 'kind' => 'letter'],
        'words' => ['path' => 'lesson-2-word-items.csv', 'kind' => 'word'],
        'phrases' => ['path' => 'lesson-3-phrases.csv', 'kind' => 'phrase'],
        'sentences' => ['path' => 'lesson-4-sentences.csv', 'kind' => 'sentence'],
        'passages' => ['path' => 'lesson-5-passages.csv', 'kind' => 'passage'],
        'comprehension' => ['path' => 'lesson-6-comprehension.csv', 'kind' => 'comprehension'],
    ];

    /** @var array<string, array<string, array<string, string>>> */
    private array $rows = [];

    /**
     * @param  array<string, mixed>  $pack
     * @return list<array{practiceItemId: string, interactionMode: string, displayText: string, comprehension?: array{choices: list<array{choiceId: string, label: string}>, correctChoiceId: string, feedbackText: string}}>
     */
    public function items(array $pack): array
    {
        $source = $pack['source'];
        $dataset = $source['dataset'];
        $definition = self::DATASETS[$dataset] ?? null;
        if ($definition === null || $source['expected_kind'] !== $definition['kind']) {
            throw new RuntimeException('Offline practice source dataset is not approved.');
        }

        $rows = $this->readRows($dataset, $definition['path']);
        $resolved = [];
        foreach ($source['items'] as $item) {
            $row = $rows[$item['source_content_id']] ?? null;
            if ($row === null
                || $row['status'] !== 'active'
                || ($row['content_version'] ?? '') !== 'v1'
                || ($row['target_type'] ?? '') !== $definition['kind']
                || (($row['pronunciation_review'] ?? 'approved') !== 'approved')
                || trim($row['display_text'] ?? '') === '') {
                throw new RuntimeException('Offline practice source content is not publishable.');
            }

            $displayText = trim($row['display_text']);
            if (mb_strlen($displayText) > (int) config('offline_practice.limits.max_text_length')) {
                throw new RuntimeException('Offline practice source text is too long.');
            }
            $resolvedItem = [
                'practiceItemId' => $item['practice_item_id'],
                'interactionMode' => $item['interaction_mode'],
                'displayText' => $displayText,
            ];
            if ($definition['kind'] === 'comprehension') {
                $choices = [];
                foreach (['a', 'b', 'c', 'd'] as $choiceKey) {
                    $choiceLabel = trim((string) ($row["choice_{$choiceKey}"] ?? ''));
                    if ($choiceLabel !== '') {
                        $choices[] = [
                            'choiceId' => "{$item['practice_item_id']}-choice-{$choiceKey}",
                            'label' => $choiceLabel,
                        ];
                    }
                }
                $correctKey = trim((string) ($row['correct_choice_key'] ?? ''));
                $feedbackText = trim((string) ($row['correct_feedback_text'] ?? ''));
                if (count($choices) < 2
                    || ! in_array($correctKey, ['a', 'b', 'c', 'd'], true)
                    || $feedbackText === '') {
                    throw new RuntimeException('Offline comprehension source content is invalid.');
                }
                $resolvedItem['comprehension'] = [
                    'choices' => $choices,
                    'correctChoiceId' => "{$item['practice_item_id']}-choice-{$correctKey}",
                    'feedbackText' => $feedbackText,
                ];
            }
            $resolved[] = $resolvedItem;
        }

        return $resolved;
    }

    /** @return array<string, array<string, string>> */
    private function readRows(string $dataset, string $file): array
    {
        if (isset($this->rows[$dataset])) {
            return $this->rows[$dataset];
        }

        $path = base_path("../../content/lessons/v1/{$file}");
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Offline practice source content is unavailable.');
        }
        try {
            $header = fgetcsv($handle);
            if (! is_array($header) || $header === [] || count(array_unique($header)) !== count($header)) {
                throw new RuntimeException('Offline practice source headers are invalid.');
            }
            $rows = [];
            while (($values = fgetcsv($handle)) !== false) {
                if (count($values) !== count($header)) {
                    throw new RuntimeException('Offline practice source row is invalid.');
                }
                $row = array_combine($header, $values);
                if (! is_array($row) || trim((string) ($row['content_id'] ?? '')) === '') {
                    throw new RuntimeException('Offline practice source ID is invalid.');
                }
                $id = trim($row['content_id']);
                if (isset($rows[$id])) {
                    throw new RuntimeException('Offline practice source IDs are duplicated.');
                }
                $rows[$id] = $row;
            }

            return $this->rows[$dataset] = $rows;
        } finally {
            fclose($handle);
        }
    }
}
