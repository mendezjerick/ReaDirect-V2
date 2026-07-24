<?php

namespace App\Services;

use DomainException;

final class LearnWithClaraLessonOneFlow
{
    public const START_SCENE = 'chapter-1-item-a';

    public const STORY_KEY = 'clara-learning-to-write-her-name';

    /**
     * @var array<string, array{
     *     kind: string,
     *     title: string,
     *     display_text: string,
     *     speech_key: string,
     *     item_progress: array{current: int, total: int}|null,
     *     choices?: list<array{action: string, label: string}>
     * }>
     */
    private const SCENES = [
        'chapter-1-item-a' => [
            'kind' => 'letter_pair',
            'title' => 'Big and small letters',
            'display_text' => 'A a',
            'speech_key' => 'learn-with-clara-lesson-1-pair-a',
            'item_progress' => ['current' => 1, 'total' => 5],
        ],
        'chapter-1-item-b' => [
            'kind' => 'letter_pair',
            'title' => 'Big and small letters',
            'display_text' => 'B b',
            'speech_key' => 'learn-with-clara-lesson-1-pair-b',
            'item_progress' => ['current' => 2, 'total' => 5],
        ],
        'chapter-1-story-opening' => [
            'kind' => 'story',
            'title' => 'A funny memory',
            'display_text' => 'My very big name',
            'speech_key' => 'learn-with-clara-lesson-1-story-name-opening',
            'item_progress' => null,
            'choices' => [
                ['action' => 'tell_more', 'label' => 'Tell me more'],
                ['action' => 'keep_learning', 'label' => 'Keep learning'],
            ],
        ],
        'chapter-1-story-detail' => [
            'kind' => 'story',
            'title' => 'The tiny ending',
            'display_text' => 'Clara',
            'speech_key' => 'learn-with-clara-lesson-1-story-name-detail',
            'item_progress' => null,
        ],
        'chapter-1-story-close' => [
            'kind' => 'story',
            'title' => 'A fresh page',
            'display_text' => 'Try again',
            'speech_key' => 'learn-with-clara-lesson-1-story-name-close',
            'item_progress' => null,
        ],
        'chapter-1-story-return' => [
            'kind' => 'story',
            'title' => 'Back to our letters',
            'display_text' => 'A B C',
            'speech_key' => 'learn-with-clara-lesson-1-story-name-return',
            'item_progress' => null,
        ],
        'chapter-1-item-c' => [
            'kind' => 'letter_pair',
            'title' => 'Big and small letters',
            'display_text' => 'C c',
            'speech_key' => 'learn-with-clara-lesson-1-pair-c',
            'item_progress' => ['current' => 3, 'total' => 5],
        ],
        'chapter-1-item-d' => [
            'kind' => 'letter_pair',
            'title' => 'Big and small letters',
            'display_text' => 'D d',
            'speech_key' => 'learn-with-clara-lesson-1-pair-d',
            'item_progress' => ['current' => 4, 'total' => 5],
        ],
        'chapter-1-item-e' => [
            'kind' => 'letter_pair',
            'title' => 'Big and small letters',
            'display_text' => 'E e',
            'speech_key' => 'learn-with-clara-lesson-1-pair-e',
            'item_progress' => ['current' => 5, 'total' => 5],
        ],
        'chapter-1-complete' => [
            'kind' => 'completion',
            'title' => 'Chapter complete',
            'display_text' => 'Great listening!',
            'speech_key' => 'learn-with-clara-lesson-1-chapter-1-complete',
            'item_progress' => null,
        ],
    ];

    /** @return array<string, mixed> */
    public function scene(string $sceneKey): array
    {
        return self::SCENES[$sceneKey]
            ?? throw new DomainException("Unknown Learn with Ma'am Clara scene {$sceneKey}.");
    }

    public function nextScene(string $sceneKey, string $action): string
    {
        if ($sceneKey === 'chapter-1-story-opening') {
            return match ($action) {
                'tell_more' => 'chapter-1-story-detail',
                'keep_learning' => 'chapter-1-story-return',
                default => throw new DomainException('Choose whether to hear more or keep learning.'),
            };
        }

        if ($action !== 'continue') {
            throw new DomainException('That companion-class action is not available here.');
        }

        return match ($sceneKey) {
            'chapter-1-item-a' => 'chapter-1-item-b',
            'chapter-1-item-b' => 'chapter-1-story-opening',
            'chapter-1-story-detail' => 'chapter-1-story-close',
            'chapter-1-story-close' => 'chapter-1-story-return',
            'chapter-1-story-return' => 'chapter-1-item-c',
            'chapter-1-item-c' => 'chapter-1-item-d',
            'chapter-1-item-d' => 'chapter-1-item-e',
            'chapter-1-item-e' => 'chapter-1-complete',
            default => throw new DomainException('This companion-class scene cannot advance.'),
        };
    }

    /** @return list<string> */
    public function prefetchSpeechKeys(string $sceneKey): array
    {
        return match ($sceneKey) {
            'chapter-1-item-a' => ['learn-with-clara-lesson-1-pair-b'],
            'chapter-1-item-b' => ['learn-with-clara-lesson-1-story-name-opening'],
            'chapter-1-story-opening' => [
                'learn-with-clara-lesson-1-story-name-detail',
                'learn-with-clara-lesson-1-story-name-return',
            ],
            'chapter-1-story-detail' => ['learn-with-clara-lesson-1-story-name-close'],
            'chapter-1-story-close' => ['learn-with-clara-lesson-1-story-name-return'],
            'chapter-1-story-return' => ['learn-with-clara-lesson-1-pair-c'],
            'chapter-1-item-c' => ['learn-with-clara-lesson-1-pair-d'],
            'chapter-1-item-d' => ['learn-with-clara-lesson-1-pair-e'],
            'chapter-1-item-e' => ['learn-with-clara-lesson-1-chapter-1-complete'],
            default => [],
        };
    }
}
