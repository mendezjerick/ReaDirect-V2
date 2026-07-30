<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

final class SystemAdminLearningContentService
{
    private const ASSESSMENT_TASKS = [
        [
            'key' => 'task-1a',
            'label' => 'Letter knowledge',
            'file' => 'assessments/v1/shared/task-1a-letters.csv',
            'expected_items' => 10,
            'delivery' => 'Fixed order',
        ],
        [
            'key' => 'task-2a',
            'label' => 'Rhyming decisions',
            'file' => 'assessments/v1/shared/task-2a-rhymes.csv',
            'expected_items' => 10,
            'delivery' => 'Fixed order',
        ],
        [
            'key' => 'task-2b',
            'label' => 'Word reading',
            'file' => 'assessments/v1/shared/task-2b-words.csv',
            'expected_items' => 10,
            'delivery' => 'Fixed order',
        ],
        [
            'key' => 'task-3a',
            'label' => 'Passage reading',
            'file' => 'assessments/v1/shared/task-3a-passages.csv',
            'expected_items' => 2,
            'delivery' => 'One learner-confirmed story',
        ],
        [
            'key' => 'task-3b',
            'label' => 'Story comprehension',
            'file' => 'assessments/v1/shared/task-3b-comprehension.csv',
            'expected_items' => 10,
            'delivery' => 'Five questions for the selected story',
        ],
    ];

    private const LESSONS = [
        [
            'key' => 'lesson-1',
            'label' => 'Letters',
            'file' => 'lessons/v1/lesson-1-letter-items.csv',
            'minimum_active_items' => 15,
            'session_items' => 15,
            'missions' => 3,
            'selection' => 'Without replacement, then cycle',
        ],
        [
            'key' => 'lesson-2',
            'label' => 'Words',
            'file' => 'lessons/v1/lesson-2-word-items.csv',
            'minimum_active_items' => 10,
            'session_items' => 10,
            'missions' => 2,
            'selection' => 'Without replacement, then cycle',
        ],
        [
            'key' => 'lesson-3',
            'label' => 'Phrases',
            'file' => 'lessons/v1/lesson-3-phrases.csv',
            'minimum_active_items' => 5,
            'session_items' => 5,
            'missions' => 1,
            'selection' => 'Without replacement, then cycle',
        ],
        [
            'key' => 'lesson-4',
            'label' => 'Sentences',
            'file' => 'lessons/v1/lesson-4-sentences.csv',
            'minimum_active_items' => 5,
            'session_items' => 5,
            'missions' => 1,
            'selection' => 'Without replacement, then cycle',
        ],
        [
            'key' => 'lesson-5',
            'label' => 'Passages',
            'file' => 'lessons/v1/lesson-5-passages.csv',
            'minimum_active_items' => 1,
            'session_items' => 1,
            'missions' => 1,
            'selection' => 'Without replacement, then cycle',
        ],
        [
            'key' => 'lesson-6',
            'label' => 'Comprehension',
            'file' => 'lessons/v1/lesson-6-comprehension.csv',
            'minimum_active_items' => 5,
            'session_items' => 5,
            'missions' => 1,
            'selection' => 'One Who, What, Where, When, and Why item',
        ],
    ];

    public function assessments(): array
    {
        $tasks = array_map(function (array $definition): array {
            $rows = $this->readCsv($definition['file']);
            $activeRows = $this->activeRows($rows);
            $versions = $this->versions($activeRows, 'assessment_version');
            $ready = count($activeRows) === $definition['expected_items']
                && $versions === ['v1'];

            return [
                'key' => $definition['key'],
                'label' => $definition['label'],
                'version' => $versions[0] ?? 'unpublished',
                'active_items' => count($activeRows),
                'expected_items' => $definition['expected_items'],
                'delivery' => $definition['delivery'],
                'status' => $ready ? 'ready' : 'attention',
                'source_file' => $definition['file'],
            ];
        }, self::ASSESSMENT_TASKS);

        return [
            'summary' => [
                'version' => 'v1',
                'active_items' => array_sum(array_column($tasks, 'active_items')),
                'ready_tasks' => count(array_filter(
                    $tasks,
                    fn (array $task): bool => $task['status'] === 'ready',
                )),
                'total_tasks' => count($tasks),
                'publication_state' => 'Published',
            ],
            'tasks' => $tasks,
            'governance' => [
                'read_only' => true,
                'message' => 'Published assessment forms are fixed, ordered, and immutable. Corrections require a new reviewed version.',
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function lessons(): array
    {
        $lessons = array_map(function (array $definition): array {
            $rows = $this->readCsv($definition['file']);
            $activeRows = $this->activeRows($rows);
            $versions = $this->versions($activeRows, 'content_version');
            $ready = count($activeRows) >= $definition['minimum_active_items']
                && $versions === ['v1'];

            if ($definition['key'] === 'lesson-6') {
                $questionTypes = array_values(array_unique(array_column($activeRows, 'question_type')));
                sort($questionTypes);
                $ready = $ready && $questionTypes === ['what', 'when', 'where', 'who', 'why'];
            }

            return [
                'key' => $definition['key'],
                'label' => $definition['label'],
                'version' => $versions[0] ?? 'unpublished',
                'active_items' => count($activeRows),
                'minimum_active_items' => $definition['minimum_active_items'],
                'session_items' => $definition['session_items'],
                'missions' => $definition['missions'],
                'selection' => $definition['selection'],
                'status' => $ready ? 'ready' : 'attention',
                'source_file' => $definition['file'],
            ];
        }, self::LESSONS);

        return [
            'summary' => [
                'version' => 'v1',
                'active_items' => array_sum(array_column($lessons, 'active_items')),
                'ready_lessons' => count(array_filter(
                    $lessons,
                    fn (array $lesson): bool => $lesson['status'] === 'ready',
                )),
                'total_lessons' => count($lessons),
                'publication_state' => 'Published',
            ],
            'lessons' => $lessons,
            'governance' => [
                'read_only' => true,
                'message' => 'Lesson sessions select active targets without replacement. Started learner snapshots remain unchanged.',
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function rules(): array
    {
        return [
            'part_one' => [
                'maximum_score' => 30,
                'bands' => [
                    ['minimum' => 0, 'maximum' => 10, 'label' => 'Full Refresher'],
                    ['minimum' => 11, 'maximum' => 16, 'label' => 'Moderate Refresher'],
                    ['minimum' => 17, 'maximum' => 26, 'label' => 'Light Refresher'],
                    ['minimum' => 27, 'maximum' => 30, 'label' => 'Grade Ready'],
                ],
            ],
            'final_reading' => [
                'comprehension_weight_percent' => 60,
                'reading_accuracy_weight_percent' => 40,
                'bands' => [
                    ['minimum' => 0, 'maximum' => 25, 'label' => 'Low Emerging Reader'],
                    ['minimum' => 26, 'maximum' => 50, 'label' => 'High Emerging Reader'],
                    ['minimum' => 51, 'maximum' => 75, 'label' => 'Developing Reader'],
                    ['minimum' => 76, 'maximum' => 90, 'label' => 'Transitioning Reader'],
                    ['minimum' => 91, 'maximum' => 100, 'label' => 'Reading at Grade Level'],
                ],
            ],
            'delivery_guards' => [
                [
                    'title' => 'Assessment form stability',
                    'description' => 'Published assessment items keep their authored order and are not randomized.',
                ],
                [
                    'title' => 'Lesson variety',
                    'description' => 'Active lesson targets are selected without replacement until the eligible pool cycles.',
                ],
                [
                    'title' => 'Snapshot immutability',
                    'description' => 'A started assessment or lesson keeps its original content snapshot.',
                ],
                [
                    'title' => 'Transcript equivalence',
                    'description' => 'Reviewed accepted transcript differences are managed in the Equivalence Book.',
                ],
            ],
            'governance' => [
                'read_only' => true,
                'message' => 'This workspace mirrors the current runtime rules. Rule changes require reviewed source and regression updates.',
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /** @return list<array<string, string>> */
    private function readCsv(string $relativePath): array
    {
        $path = base_path('../../content/'.$relativePath);
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException("Learning content is unavailable: {$relativePath}");
        }

        try {
            $headers = fgetcsv($stream, escape: '');
            if (! is_array($headers)) {
                throw new RuntimeException("Learning content has no header: {$relativePath}");
            }

            $rows = [];
            while (($values = fgetcsv($stream, escape: '')) !== false) {
                if ($values === [null] || $values === []) {
                    continue;
                }
                if (count($values) !== count($headers)) {
                    throw new RuntimeException("Learning content row is malformed: {$relativePath}");
                }
                $row = array_combine($headers, $values);
                if ($row !== false) {
                    $rows[] = $row;
                }
            }

            return $rows;
        } finally {
            fclose($stream);
        }
    }

    /** @param list<array<string, string>> $rows
     * @return list<array<string, string>>
     */
    private function activeRows(array $rows): array
    {
        return array_values(array_filter(
            $rows,
            fn (array $row): bool => ($row['status'] ?? '') === 'active',
        ));
    }

    /** @param list<array<string, string>> $rows
     * @return list<string>
     */
    private function versions(array $rows, string $column): array
    {
        $versions = array_values(array_unique(array_filter(array_column($rows, $column))));
        sort($versions);

        return $versions;
    }
}
