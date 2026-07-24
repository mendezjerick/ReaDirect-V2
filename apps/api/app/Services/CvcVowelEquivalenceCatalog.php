<?php

namespace App\Services;

final class CvcVowelEquivalenceCatalog
{
    /** @var list<string> */
    private const EQUIVALENT_MIDDLE_VOWELS = ['a', 'o', 'u'];

    private const CVC_PATTERN = '/^[bcdfghjklmnpqrstvwxyz][aou][bcdfghjklmnpqrstvwxyz]$/';

    public function __construct(
        private readonly SpeechContentCatalog $speechContent,
    ) {}

    /**
     * @return list<array{
     *     expected_text: string,
     *     recognized_text: string,
     *     scope: string,
     *     item_key: string,
     *     source_group: string
     * }>
     */
    public function rules(): array
    {
        $rules = [];

        foreach ($this->speechContent->forTrueSandbox()['groups'] as $group) {
            foreach ($group['items'] as $item) {
                foreach ($this->tokens($item['expected_text']) as $token) {
                    if (! preg_match(self::CVC_PATTERN, $token)) {
                        continue;
                    }

                    foreach (self::EQUIVALENT_MIDDLE_VOWELS as $vowel) {
                        $recognized = $token[0].$vowel.$token[2];
                        if ($recognized === $token) {
                            continue;
                        }

                        $key = implode("\0", [
                            $item['item_key'],
                            $token,
                            $recognized,
                        ]);
                        $rules[$key] = [
                            'expected_text' => $token,
                            'recognized_text' => $recognized,
                            'scope' => 'item',
                            'item_key' => $item['item_key'],
                            'source_group' => $group['key'],
                        ];
                    }
                }
            }
        }

        ksort($rules);

        return array_values($rules);
    }

    /** @return list<string> */
    private function tokens(string $value): array
    {
        preg_match_all("/[a-z0-9']+/", mb_strtolower($value), $matches);

        return array_values(array_unique($matches[0]));
    }
}
