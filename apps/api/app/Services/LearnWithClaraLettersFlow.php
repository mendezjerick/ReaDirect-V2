<?php

namespace App\Services;

use DomainException;

final class LearnWithClaraLettersFlow
{
    public const START_SCENE = 'parade-opening';

    public const COMPLETION_SCENE = 'parade-finale';

    /**
     * @var array<string, array{
     *     kind: string,
     *     title: string,
     *     display_text: string,
     *     pronunciation: string,
     *     speech_key: string,
     *     choices: list<string>,
     *     item_progress: array{current: int, total: int}|null
     * }>
     */
    private const SCENES = [
        self::START_SCENE => [
            'kind' => 'story',
            'title' => 'The little letters blew away',
            'display_text' => 'A B C D E',
            'pronunciation' => '',
            'speech_key' => 'learn-with-clara-letters-parade-opening',
            'choices' => [],
            'item_progress' => ['current' => 1, 'total' => 5],
        ],
        'find-a' => [
            'kind' => 'find',
            'title' => 'Find little a',
            'display_text' => 'A a',
            'pronunciation' => 'ay',
            'speech_key' => 'learn-with-clara-letters-find-a',
            'choices' => ['d', 'a', 'e'],
            'item_progress' => ['current' => 1, 'total' => 5],
        ],
        'teach-a' => [
            'kind' => 'teach',
            'title' => 'A found its partner',
            'display_text' => 'A a',
            'pronunciation' => 'ay',
            'speech_key' => 'lesson-1-letter-demo-A',
            'choices' => [],
            'item_progress' => ['current' => 1, 'total' => 5],
        ],
        'find-b' => [
            'kind' => 'find',
            'title' => 'Find little b',
            'display_text' => 'B b',
            'pronunciation' => 'bee',
            'speech_key' => 'learn-with-clara-letters-find-b',
            'choices' => ['p', 'b', 'd'],
            'item_progress' => ['current' => 2, 'total' => 5],
        ],
        'teach-b' => [
            'kind' => 'teach',
            'title' => 'B found its partner',
            'display_text' => 'B b',
            'pronunciation' => 'bee',
            'speech_key' => 'lesson-1-letter-demo-B',
            'choices' => [],
            'item_progress' => ['current' => 2, 'total' => 5],
        ],
        'find-c' => [
            'kind' => 'find',
            'title' => 'Find little c',
            'display_text' => 'C c',
            'pronunciation' => 'see',
            'speech_key' => 'learn-with-clara-letters-find-c',
            'choices' => ['o', 'e', 'c'],
            'item_progress' => ['current' => 3, 'total' => 5],
        ],
        'teach-c' => [
            'kind' => 'teach',
            'title' => 'C found its partner',
            'display_text' => 'C c',
            'pronunciation' => 'see',
            'speech_key' => 'lesson-1-letter-demo-C',
            'choices' => [],
            'item_progress' => ['current' => 3, 'total' => 5],
        ],
        'find-d' => [
            'kind' => 'find',
            'title' => 'Find little d',
            'display_text' => 'D d',
            'pronunciation' => 'dee',
            'speech_key' => 'learn-with-clara-letters-find-d',
            'choices' => ['b', 'q', 'd'],
            'item_progress' => ['current' => 4, 'total' => 5],
        ],
        'teach-d' => [
            'kind' => 'teach',
            'title' => 'D found its partner',
            'display_text' => 'D d',
            'pronunciation' => 'dee',
            'speech_key' => 'lesson-1-letter-demo-D',
            'choices' => [],
            'item_progress' => ['current' => 4, 'total' => 5],
        ],
        'find-e' => [
            'kind' => 'find',
            'title' => 'Find little e',
            'display_text' => 'E e',
            'pronunciation' => 'ee',
            'speech_key' => 'learn-with-clara-letters-find-e',
            'choices' => ['c', 'e', 'a'],
            'item_progress' => ['current' => 5, 'total' => 5],
        ],
        'teach-e' => [
            'kind' => 'teach',
            'title' => 'E found its partner',
            'display_text' => 'E e',
            'pronunciation' => 'ee',
            'speech_key' => 'lesson-1-letter-demo-E',
            'choices' => [],
            'item_progress' => ['current' => 5, 'total' => 5],
        ],
        self::COMPLETION_SCENE => [
            'kind' => 'completion',
            'title' => 'The Letter Parade',
            'display_text' => 'A a B b C c D d E e',
            'pronunciation' => '',
            'speech_key' => 'learn-with-clara-letters-parade-finale',
            'choices' => [],
            'item_progress' => null,
        ],
    ];

    /** @return array<string, mixed> */
    public function scene(string $sceneKey): array
    {
        return self::SCENES[$sceneKey]
            ?? throw new DomainException("Unknown Learn with Ma'am Clara letters scene {$sceneKey}.");
    }

    public function hasScene(string $sceneKey): bool
    {
        return isset(self::SCENES[$sceneKey]);
    }

    public function nextScene(string $sceneKey): string
    {
        return match ($sceneKey) {
            self::START_SCENE => 'find-a',
            'find-a' => 'teach-a',
            'teach-a' => 'find-b',
            'find-b' => 'teach-b',
            'teach-b' => 'find-c',
            'find-c' => 'teach-c',
            'teach-c' => 'find-d',
            'find-d' => 'teach-d',
            'teach-d' => 'find-e',
            'find-e' => 'teach-e',
            'teach-e' => self::COMPLETION_SCENE,
            default => throw new DomainException('This letters-class scene cannot advance.'),
        };
    }

    /** @return list<string> */
    public function prefetchSpeechKeys(string $sceneKey): array
    {
        return match ($sceneKey) {
            self::START_SCENE => ['learn-with-clara-letters-find-a'],
            'find-a' => ['lesson-1-letter-demo-A'],
            'teach-a' => ['learn-with-clara-letters-find-b'],
            'find-b' => ['lesson-1-letter-demo-B'],
            'teach-b' => ['learn-with-clara-letters-find-c'],
            'find-c' => ['lesson-1-letter-demo-C'],
            'teach-c' => ['learn-with-clara-letters-find-d'],
            'find-d' => ['lesson-1-letter-demo-D'],
            'teach-d' => ['learn-with-clara-letters-find-e'],
            'find-e' => ['lesson-1-letter-demo-E'],
            'teach-e' => ['learn-with-clara-letters-parade-finale'],
            default => [],
        };
    }
}
