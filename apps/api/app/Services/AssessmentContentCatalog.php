<?php

namespace App\Services;

use RuntimeException;

final class AssessmentContentCatalog
{
    /** @return array<string, list<array<string, string>>> */
    public function partOneSnapshot(): array
    {
        return [
            'task-1a' => $this->read('task-1a-letters.csv'),
            'task-2a' => $this->read('task-2a-rhymes.csv'),
            'task-2b' => $this->read('task-2b-words.csv'),
        ];
    }

    /** @return array<string, list<array<string, string>>> */
    public function assessmentSnapshot(): array
    {
        return [
            ...$this->partOneSnapshot(),
            'task-3a' => $this->read('task-3a-passages.csv', 'choice_order'),
            'task-3b' => $this->read('task-3b-comprehension.csv'),
        ];
    }

    /** @return list<array<string, string>> */
    private function read(string $filename, string $orderColumn = 'sort_order'): array
    {
        $path = base_path("../../content/assessments/v1/shared/{$filename}");
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException("Assessment content is unavailable: {$filename}");
        }

        try {
            $headers = fgetcsv($stream);
            if (! is_array($headers)) {
                throw new RuntimeException("Assessment content has no header: {$filename}");
            }

            $rows = [];
            while (($values = fgetcsv($stream)) !== false) {
                if (count($values) !== count($headers)) {
                    throw new RuntimeException("Assessment content row is malformed: {$filename}");
                }

                $row = array_combine($headers, $values);
                if ($row !== false && ($row['status'] ?? '') === 'active') {
                    $rows[] = $row;
                }
            }

            usort($rows, fn (array $left, array $right): int => (int) $left[$orderColumn] <=> (int) $right[$orderColumn]);

            return $rows;
        } finally {
            fclose($stream);
        }
    }
}
