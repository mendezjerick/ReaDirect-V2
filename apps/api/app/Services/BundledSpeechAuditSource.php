<?php

namespace App\Services;

use JsonException;
use RuntimeException;

final class BundledSpeechAuditSource
{
    /** @var array<string, string> */
    private const FIXTURE_SOURCE_TO_INTERNAL_SET = [
        'elevenlabs-filipino-childlike-female-voice-1' => 'millie2',
        'elevenlabs-filipino-childlike-female-voice-2' => 'millie2-plus',
        'jezreel-r-ramos' => 'jz',
        'shaila-patrice-d-avallenda' => 'shai',
    ];

    public const CONTENT_AUDIT_VERSION = 'four-voice-item-token-v3';

    public const LETTER_AUDIT_VERSION = 'three-voice-letter-alias-v1';

    public const CONTENT_NEGATIVE_AUDIT_VERSION = 'content-distractor-raw-v1';

    public const LETTER_NEGATIVE_AUDIT_VERSION = 'letter-distractor-raw-v1';

    private const CONTENT_AUDIT_PATH = 'services/asr/fixtures/content/fixture-equivalence-audit.json';

    private const LETTER_AUDIT_PATH = 'services/asr/fixtures/letters/fixture-equivalence-audit.json';

    private const CONTENT_NEGATIVE_AUDIT_PATH = 'services/asr/fixtures/distractors/distractor-evaluation-audit.json';

    private const LETTER_NEGATIVE_AUDIT_PATH = 'services/asr/fixtures/distractors/letter-distractor-evaluation-audit.json';

    /**
     * @return list<array{
     *     scope: 'content'|'letter',
     *     fixture_set: string,
     *     task_type: string,
     *     expected: string,
     *     recognized: string,
     *     raw_exact: bool,
     *     accepted: bool
     * }>
     */
    public function positiveAttempts(): array
    {
        $content = $this->audit(self::CONTENT_AUDIT_PATH, self::CONTENT_AUDIT_VERSION);
        $letters = $this->audit(self::LETTER_AUDIT_PATH, self::LETTER_AUDIT_VERSION);
        $attempts = [];

        foreach ($content['records'] as $record) {
            if (! is_array($record) || ($record['status'] ?? null) !== 'completed') {
                continue;
            }

            $expected = $this->normalize((string) ($record['expected_text'] ?? ''));
            $recognized = $this->normalize((string) ($record['raw_transcript'] ?? ''));
            $fixtureType = (string) ($record['fixture_type'] ?? '');
            $attempts[] = [
                'scope' => 'content',
                'fixture_set' => (string) ($record['fixture_set'] ?? ''),
                'task_type' => $fixtureType === 'comprehension-answer'
                    ? 'comprehension'
                    : $fixtureType,
                'expected' => $expected,
                'recognized' => $recognized,
                'raw_exact' => (bool) ($record['raw_exact_match'] ?? false),
                'accepted' => (bool) ($record['raw_exact_match'] ?? false),
            ];
        }

        foreach ($letters['records'] as $record) {
            if (! is_array($record) || ($record['status'] ?? null) !== 'completed') {
                continue;
            }

            $expected = $this->normalize((string) ($record['expected_letter'] ?? ''));
            $recognized = $this->normalize((string) (
                $record['normalized_transcript']
                    ?? $record['raw_transcript']
                    ?? ''
            ));
            $alias = $record['alias'] ?? null;
            $aliasAccepted = is_array($alias)
                && in_array(($alias['status'] ?? null), ['created', 'existing'], true)
                && (bool) ($alias['is_active'] ?? false);
            $attempts[] = [
                'scope' => 'letter',
                'fixture_set' => (string) ($record['fixture_set'] ?? ''),
                'task_type' => 'letter',
                'expected' => $expected,
                'recognized' => $recognized,
                'raw_exact' => $expected !== '' && $expected === $recognized,
                'accepted' => ($record['decision_before_enrichment'] ?? null) === 'CORRECT'
                    || $aliasAccepted,
            ];
        }

        return $attempts;
    }

    /**
     * @return list<array{
     *     scope: 'content'|'letter',
     *     source: string,
     *     accepted: bool
     * }>
     */
    public function negativeAttempts(): array
    {
        $content = $this->audit(
            self::CONTENT_NEGATIVE_AUDIT_PATH,
            self::CONTENT_NEGATIVE_AUDIT_VERSION,
        );
        $letters = $this->audit(
            self::LETTER_NEGATIVE_AUDIT_PATH,
            self::LETTER_NEGATIVE_AUDIT_VERSION,
        );
        $attempts = [];

        foreach ($content['records'] as $record) {
            if (! is_array($record) || ($record['status'] ?? null) !== 'completed') {
                continue;
            }

            $attempts[] = [
                'scope' => 'content',
                'source' => (string) ($record['distractor_type'] ?? 'unknown'),
                'accepted' => (bool) ($record['raw_accepted'] ?? false),
            ];
        }

        foreach ($letters['records'] as $record) {
            if (! is_array($record) || ($record['status'] ?? null) !== 'completed') {
                continue;
            }

            $attempts[] = [
                'scope' => 'letter',
                'source' => (string) ($record['distractor_type'] ?? 'unknown'),
                'accepted' => (bool) ($record['resolver_accepted'] ?? false),
            ];
        }

        return $attempts;
    }

    /** @return array<string, string> */
    public function versions(): array
    {
        return [
            'content' => self::CONTENT_AUDIT_VERSION,
            'letters' => self::LETTER_AUDIT_VERSION,
            'content_negatives' => self::CONTENT_NEGATIVE_AUDIT_VERSION,
            'letter_negatives' => self::LETTER_NEGATIVE_AUDIT_VERSION,
        ];
    }

    /** @return array<string, mixed> */
    public function provenance(): array
    {
        return [
            'content_description' => 'ReaDirect Version 1 assessment and lesson content synthesized with VoxCPM2 from the listed reference voices.',
            'sources' => [
                [
                    'id' => 'elevenlabs-filipino-childlike-female-voice-1',
                    'display_name' => 'ElevenLabs child-like Filipino female voice 1',
                    'description' => 'An ElevenLabs-generated, high-pitched Filipino female reference voice selected to approximate children\'s speech.',
                ],
                [
                    'id' => 'elevenlabs-filipino-childlike-female-voice-2',
                    'display_name' => 'ElevenLabs child-like Filipino female voice 2',
                    'description' => 'An alternate ElevenLabs-generated, high-pitched Filipino female reference voice selected to approximate children\'s speech.',
                ],
                [
                    'id' => 'jezreel-r-ramos',
                    'display_name' => 'Jezreel R. Ramos',
                    'description' => 'VoxCPM2 fixture recordings generated from the Jezreel R. Ramos reference voice.',
                ],
                [
                    'id' => 'shaila-patrice-d-avallenda',
                    'display_name' => 'Shaila Patrice D. Avallenda',
                    'description' => 'VoxCPM2 fixture recordings generated from the Shaila Patrice D. Avallenda reference voice.',
                ],
            ],
            'negative' => [
                'display_name' => 'Kaggle negative fixture set',
                'description' => 'Known-negative noisy-speech and silence recordings sourced from the Kaggle dataset by abdullahhaydarkadolu.',
            ],
        ];
    }

    /** @return list<string> */
    public static function fixtureSourceIds(): array
    {
        return array_keys(self::FIXTURE_SOURCE_TO_INTERNAL_SET);
    }

    public function internalFixtureSetForSource(string $fixtureSource): string
    {
        if (! array_key_exists($fixtureSource, self::FIXTURE_SOURCE_TO_INTERNAL_SET)) {
            throw new RuntimeException('Unknown bundled fixture source.');
        }

        return self::FIXTURE_SOURCE_TO_INTERNAL_SET[$fixtureSource];
    }

    /** @return array{audit_version: string, records: array<string, mixed>} */
    private function audit(string $relativePath, string $expectedVersion): array
    {
        $path = dirname(base_path(), 2).DIRECTORY_SEPARATOR.str_replace(
            '/',
            DIRECTORY_SEPARATOR,
            $relativePath,
        );

        if (! is_file($path)) {
            throw new RuntimeException("Bundled speech audit is missing: {$relativePath}");
        }

        try {
            $audit = json_decode(
                (string) file_get_contents($path),
                true,
                512,
                JSON_THROW_ON_ERROR,
            );
        } catch (JsonException $error) {
            throw new RuntimeException(
                "Bundled speech audit is invalid: {$relativePath}",
                previous: $error,
            );
        }

        if (! is_array($audit)
            || ($audit['audit_version'] ?? null) !== $expectedVersion
            || ! isset($audit['records'])
            || ! is_array($audit['records'])) {
            throw new RuntimeException(
                "Bundled speech audit has an unexpected contract: {$relativePath}",
            );
        }

        return $audit;
    }

    private function normalize(string $value): string
    {
        preg_match_all("/[a-z0-9']+/", mb_strtolower($value), $matches);

        return implode(' ', $matches[0]);
    }
}
