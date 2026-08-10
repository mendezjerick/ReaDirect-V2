<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

final class OfflinePracticePackCatalog
{
    private const PACK_KEYS = [
        'pack_id', 'version', 'module_key', 'category_key', 'title', 'minimum_app_version',
        'academic_content_language', 'supported_languages', 'status',
        'created_at', 'updated_at', 'source', 'dialogues',
    ];

    private const SOURCE_KEYS = ['dataset', 'expected_kind', 'items'];

    private const ITEM_KEYS = [
        'source_content_id', 'practice_item_id', 'interaction_mode',
    ];

    /** @var array<string, string> */
    private const INTERACTION_MODE_BY_KIND = [
        'letter' => 'letter_read',
        'word' => 'word_read',
        'phrase' => 'phrase_read',
        'sentence' => 'sentence_read',
        'passage' => 'passage_read',
        'comprehension' => 'comprehension_choice',
    ];

    private const CATEGORY_KEYS = [
        'letters', 'words', 'phrases', 'sentences', 'passages', 'comprehension',
    ];

    /** @var array<string, string> */
    private const CATEGORY_BY_KIND = [
        'letter' => 'letters',
        'word' => 'words',
        'phrase' => 'phrases',
        'sentence' => 'sentences',
        'passage' => 'passages',
        'comprehension' => 'comprehension',
    ];

    private const DIALOGUE_KEYS = [
        'dialogue_key', 'language', 'speech_key', 'text', 'audio_optional',
    ];

    /** @var array<string, array<string, mixed>> */
    private array $packsById = [];

    /** @param array<string, mixed>|null $definition */
    public function __construct(?array $definition = null)
    {
        $definition ??= require base_path('../../content/offline-practice/v1/packs.php');
        $this->validateDefinition($definition);

        foreach ($definition['packs'] as $pack) {
            if ($pack['status'] !== 'available') {
                continue;
            }
            $this->packsById[$pack['pack_id']] = $pack;
        }
    }

    /** @return list<array<string, mixed>> */
    public function available(): array
    {
        return array_values($this->packsById);
    }

    /** @return array<string, mixed> */
    public function requirePack(string $packId, ?string $version = null): array
    {
        $pack = $this->packsById[$packId] ?? null;
        if ($pack === null || ($version !== null && $pack['version'] !== $version)) {
            throw new OfflinePracticeNotFoundException;
        }

        return $pack;
    }

    /** @param array<string, mixed> $definition */
    private function validateDefinition(array $definition): void
    {
        $this->assertKeys($definition, ['schema_version', 'packs'], 'catalog');
        if ($definition['schema_version'] !== (int) config('offline_practice.schema_version', 1)) {
            throw new RuntimeException('Unsupported offline practice catalog schema.');
        }
        if (! is_array($definition['packs']) || $definition['packs'] === []) {
            throw new RuntimeException('Offline practice catalog must contain packs.');
        }

        $ids = $sourceIds = $itemIds = [];
        foreach ($definition['packs'] as $pack) {
            if (! is_array($pack)) {
                throw new RuntimeException('Offline practice pack must be an object.');
            }
            $this->assertKeys($pack, self::PACK_KEYS, 'pack');
            foreach (['pack_id', 'version', 'module_key', 'minimum_app_version'] as $key) {
                $this->assertSafeId($pack[$key], $key);
            }
            if (! in_array($pack['category_key'], self::CATEGORY_KEYS, true)) {
                throw new RuntimeException('Offline practice category is not approved.');
            }
            if (isset($ids[$pack['pack_id']])) {
                throw new RuntimeException('Offline practice pack IDs must be unique.');
            }
            $ids[$pack['pack_id']] = true;
            if (! is_string($pack['title']) || $pack['title'] === ''
                || mb_strlen($pack['title']) > $this->limit('max_title_length')) {
                throw new RuntimeException('Offline practice pack title is invalid.');
            }
            if ($pack['academic_content_language'] !== 'en'
                || ! is_array($pack['supported_languages'])
                || $pack['supported_languages'] !== ['en', 'fil']) {
                throw new RuntimeException('Offline practice languages are invalid.');
            }
            if (! in_array($pack['status'], ['available', 'retired'], true)) {
                throw new RuntimeException('Offline practice pack status is invalid.');
            }
            $this->validateSource($pack['source']);
            if (self::CATEGORY_BY_KIND[$pack['source']['expected_kind']] !== $pack['category_key']) {
                throw new RuntimeException('Offline practice category does not match its source kind.');
            }
            foreach ($pack['source']['items'] as $item) {
                if (isset($sourceIds[$item['source_content_id']]) || isset($itemIds[$item['practice_item_id']])) {
                    throw new RuntimeException('Offline practice source IDs must be unique across packs.');
                }
                $sourceIds[$item['source_content_id']] = true;
                $itemIds[$item['practice_item_id']] = true;
            }
            $this->validateDialogues($pack['dialogues']);
        }
    }

    private function validateSource(mixed $source): void
    {
        if (! is_array($source)) {
            throw new RuntimeException('Offline practice source is invalid.');
        }
        $this->assertKeys($source, self::SOURCE_KEYS, 'source');
        foreach (['dataset', 'expected_kind'] as $key) {
            $this->assertSafeId($source[$key], $key);
        }
        $expectedInteractionMode = self::INTERACTION_MODE_BY_KIND[$source['expected_kind']] ?? null;
        if ($expectedInteractionMode === null) {
            throw new RuntimeException('Offline practice source kind is not approved.');
        }
        if (! is_array($source['items']) || $source['items'] === []) {
            throw new RuntimeException('Offline practice source has no items.');
        }
        if (count($source['items']) > $this->limit('max_item_count')) {
            throw new RuntimeException('Offline practice item limit exceeded.');
        }
        $sourceIds = $itemIds = [];
        foreach ($source['items'] as $item) {
            if (! is_array($item)) {
                throw new RuntimeException('Offline practice source item is invalid.');
            }
            $this->assertKeys($item, self::ITEM_KEYS, 'source item');
            $this->assertSafeId($item['source_content_id'], 'source_content_id');
            $this->assertSafeId($item['practice_item_id'], 'practice_item_id');
            $this->assertSafeId($item['interaction_mode'], 'interaction_mode');
            if (! in_array($item['interaction_mode'], [
                'letter_read', 'word_read', 'phrase_read', 'sentence_read', 'passage_read',
                'comprehension_choice',
            ], true)) {
                throw new RuntimeException('Offline practice interaction mode is not allowed.');
            }
            if ($item['interaction_mode'] !== $expectedInteractionMode) {
                throw new RuntimeException('Offline practice interaction mode does not match its source kind.');
            }
            if (isset($sourceIds[$item['source_content_id']]) || isset($itemIds[$item['practice_item_id']])) {
                throw new RuntimeException('Offline practice source IDs must be unique.');
            }
            $sourceIds[$item['source_content_id']] = true;
            $itemIds[$item['practice_item_id']] = true;
        }
    }

    private function validateDialogues(mixed $dialogues): void
    {
        if (! is_array($dialogues) || count($dialogues) !== 2) {
            throw new RuntimeException('Offline practice requires one dialogue per supported language.');
        }
        $keys = $languages = [];
        foreach ($dialogues as $dialogue) {
            if (! is_array($dialogue)) {
                throw new RuntimeException('Offline practice dialogue is invalid.');
            }
            $this->assertKeys($dialogue, self::DIALOGUE_KEYS, 'dialogue');
            foreach (['dialogue_key', 'speech_key', 'text'] as $key) {
                if (! is_string($dialogue[$key]) || $dialogue[$key] === '') {
                    throw new RuntimeException('Offline practice dialogue text is invalid.');
                }
            }
            $this->assertSafeId($dialogue['dialogue_key'], 'dialogue_key');
            $this->assertSafeId($dialogue['speech_key'], 'speech_key');
            if (! in_array($dialogue['language'], ['en', 'fil'], true)
                || isset($keys[$dialogue['dialogue_key']])
                || isset($languages[$dialogue['language']])
                || mb_strlen($dialogue['text']) > $this->limit('max_text_length')) {
                throw new RuntimeException('Offline practice dialogue is duplicated or invalid.');
            }
            if (! is_bool($dialogue['audio_optional'])) {
                throw new RuntimeException('Offline practice audio policy is invalid.');
            }
            $keys[$dialogue['dialogue_key']] = true;
            $languages[$dialogue['language']] = true;
        }
    }

    private function assertSafeId(mixed $value, string $field): void
    {
        if (! is_string($value)
            || $value === ''
            || mb_strlen($value) > $this->limit('max_id_length')
            || preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $value) !== 1
            || str_contains($value, '..')) {
            throw new RuntimeException("Offline practice {$field} is unsafe.");
        }
    }

    /** @param array<string, mixed> $value @param list<string> $allowed */
    private function assertKeys(array $value, array $allowed, string $label): void
    {
        if (array_diff(array_keys($value), $allowed) !== []
            || array_diff($allowed, array_keys($value)) !== []) {
            throw new RuntimeException("Offline practice {$label} contains an unexpected field.");
        }
    }

    private function limit(string $key): int
    {
        return (int) config("offline_practice.limits.{$key}");
    }
}
