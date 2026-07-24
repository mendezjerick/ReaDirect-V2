<?php

namespace App\Services;

use App\Models\EquivalenceRule;
use Illuminate\Support\Collection;

final class SpeechEquivalenceResolver
{
    /**
     * Resolve a Mu transcript without changing its raw evidence.
     *
     * @return array<string, mixed>
     */
    public function resolve(string $expectedText, string $recognizedText, ?string $itemKey): array
    {
        $expected = $this->normalize($expectedText);
        $recognized = $this->normalize($recognizedText);
        $differences = $this->align(
            $expected === '' ? [] : explode(' ', $expected),
            $recognized === '' ? [] : explode(' ', $recognized),
        );

        $rules = $this->activeRules($itemKey);
        $fullRule = $rules->first(function (EquivalenceRule $rule) use ($expected, $recognized): bool {
            return ! in_array($rule->rule_type, ['token_alias', 'letter_alias'], true)
                && $this->normalize($rule->expected_text) === $expected
                && $this->normalize($rule->recognized_text) === $recognized;
        });

        $appliedRuleIds = [];
        $matchedWords = 0;
        $equivalentWords = 0;

        foreach ($differences as &$difference) {
            if ($difference['status'] === 'match') {
                $matchedWords++;

                continue;
            }

            if ($difference['status'] !== 'substitution') {
                continue;
            }

            $rule = $rules->first(function (EquivalenceRule $rule) use ($difference): bool {
                return $rule->rule_type === 'token_alias'
                    && $this->normalize($rule->expected_text) === $difference['expected']
                    && $this->normalize($rule->recognized_text) === $difference['recognized'];
            });

            if (! $rule) {
                continue;
            }

            $difference['status'] = 'equivalent';
            $difference['equivalence_rule_id'] = $rule->id;
            $appliedRuleIds[] = $rule->id;
            $equivalentWords++;
        }
        unset($difference);

        if ($fullRule) {
            $appliedRuleIds[] = $fullRule->id;
        }

        $rawExactMatch = $expected !== '' && $expected === $recognized;
        $allDifferencesAccepted = collect($differences)
            ->every(fn (array $difference): bool => in_array(
                $difference['status'],
                ['match', 'equivalent'],
                true,
            ));

        return [
            'raw_exact_match' => $rawExactMatch,
            'accepted_match' => $rawExactMatch || $fullRule !== null || ($expected !== '' && $allDifferencesAccepted),
            'resolution_source' => $rawExactMatch
                ? 'exact'
                : ($fullRule ? 'full_equivalence' : ($equivalentWords > 0 ? 'token_equivalence' : 'none')),
            'expected_word_count' => $expected === '' ? 0 : count(explode(' ', $expected)),
            'recognized_word_count' => $recognized === '' ? 0 : count(explode(' ', $recognized)),
            'matched_word_count' => $matchedWords,
            'equivalent_word_count' => $equivalentWords,
            'differences' => $differences,
            'equivalence_rule_ids' => array_values(array_unique($appliedRuleIds)),
        ];
    }

    /** @return Collection<int, EquivalenceRule> */
    private function activeRules(?string $itemKey): Collection
    {
        return EquivalenceRule::query()
            ->where('is_active', true)
            ->where(function ($query) use ($itemKey): void {
                $query->where('scope', 'global');

                if ($itemKey !== null && trim($itemKey) !== '') {
                    $query->orWhere(function ($itemQuery) use ($itemKey): void {
                        $itemQuery
                            ->where('scope', 'item')
                            ->where('item_key', trim($itemKey));
                    });
                }
            })
            ->orderBy('id')
            ->get();
    }

    private function normalize(string $value): string
    {
        preg_match_all("/[a-z0-9']+/", mb_strtolower($value), $matches);

        return implode(' ', $matches[0]);
    }

    /**
     * @param  list<string>  $expected
     * @param  list<string>  $recognized
     * @return list<array{status: string, expected: string, recognized: string}>
     */
    private function align(array $expected, array $recognized): array
    {
        $expectedCount = count($expected);
        $recognizedCount = count($recognized);
        $table = array_fill(
            0,
            $expectedCount + 1,
            array_fill(0, $recognizedCount + 1, 0),
        );

        for ($expectedIndex = 0; $expectedIndex <= $expectedCount; $expectedIndex++) {
            $table[$expectedIndex][0] = $expectedIndex;
        }
        for ($recognizedIndex = 0; $recognizedIndex <= $recognizedCount; $recognizedIndex++) {
            $table[0][$recognizedIndex] = $recognizedIndex;
        }

        for ($expectedIndex = 1; $expectedIndex <= $expectedCount; $expectedIndex++) {
            for ($recognizedIndex = 1; $recognizedIndex <= $recognizedCount; $recognizedIndex++) {
                $substitutionCost = $expected[$expectedIndex - 1]
                    === $recognized[$recognizedIndex - 1] ? 0 : 1;
                $table[$expectedIndex][$recognizedIndex] = min(
                    $table[$expectedIndex - 1][$recognizedIndex] + 1,
                    $table[$expectedIndex][$recognizedIndex - 1] + 1,
                    $table[$expectedIndex - 1][$recognizedIndex - 1]
                        + $substitutionCost,
                );
            }
        }

        $rows = [];
        $expectedIndex = $expectedCount;
        $recognizedIndex = $recognizedCount;

        while ($expectedIndex > 0 || $recognizedIndex > 0) {
            if (
                $expectedIndex > 0
                && $recognizedIndex > 0
                && $expected[$expectedIndex - 1] === $recognized[$recognizedIndex - 1]
                && $table[$expectedIndex][$recognizedIndex]
                    === $table[$expectedIndex - 1][$recognizedIndex - 1]
            ) {
                $rows[] = [
                    'status' => 'match',
                    'expected' => $expected[$expectedIndex - 1],
                    'recognized' => $recognized[$recognizedIndex - 1],
                ];
                $expectedIndex--;
                $recognizedIndex--;

                continue;
            }

            if (
                $expectedIndex > 0
                && $recognizedIndex > 0
                && $table[$expectedIndex][$recognizedIndex]
                    === $table[$expectedIndex - 1][$recognizedIndex - 1] + 1
            ) {
                $rows[] = [
                    'status' => 'substitution',
                    'expected' => $expected[$expectedIndex - 1],
                    'recognized' => $recognized[$recognizedIndex - 1],
                ];
                $expectedIndex--;
                $recognizedIndex--;

                continue;
            }

            if (
                $expectedIndex > 0
                && $table[$expectedIndex][$recognizedIndex]
                    === $table[$expectedIndex - 1][$recognizedIndex] + 1
            ) {
                $rows[] = [
                    'status' => 'omission',
                    'expected' => $expected[$expectedIndex - 1],
                    'recognized' => '',
                ];
                $expectedIndex--;

                continue;
            }

            $rows[] = [
                'status' => 'insertion',
                'expected' => '',
                'recognized' => $recognized[$recognizedIndex - 1],
            ];
            $recognizedIndex--;
        }

        return array_reverse($rows);
    }
}
