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
                    && $rule->scope === 'item'
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
        $height = count($expected) + 1;
        $width = count($recognized) + 1;
        $table = array_fill(0, $height, array_fill(0, $width, 0));

        for ($left = 1; $left < $height; $left++) {
            for ($right = 1; $right < $width; $right++) {
                $table[$left][$right] = $expected[$left - 1] === $recognized[$right - 1]
                    ? $table[$left - 1][$right - 1] + 1
                    : max($table[$left - 1][$right], $table[$left][$right - 1]);
            }
        }

        $rows = [];
        $left = count($expected);
        $right = count($recognized);

        while ($left > 0 || $right > 0) {
            if ($left > 0 && $right > 0 && $expected[$left - 1] === $recognized[$right - 1]) {
                $rows[] = [
                    'status' => 'match',
                    'expected' => $expected[$left - 1],
                    'recognized' => $recognized[$right - 1],
                ];
                $left--;
                $right--;
            } elseif ($right > 0 && ($left === 0 || $table[$left][$right - 1] >= $table[$left - 1][$right])) {
                $rows[] = [
                    'status' => 'insertion',
                    'expected' => '',
                    'recognized' => $recognized[$right - 1],
                ];
                $right--;
            } else {
                $rows[] = [
                    'status' => 'omission',
                    'expected' => $expected[$left - 1],
                    'recognized' => '',
                ];
                $left--;
            }
        }

        $rows = array_reverse($rows);

        return $this->mergeSubstitutions($rows);
    }

    /**
     * @param  list<array{status: string, expected: string, recognized: string}>  $rows
     * @return list<array{status: string, expected: string, recognized: string}>
     */
    private function mergeSubstitutions(array $rows): array
    {
        $merged = [];

        for ($index = 0; $index < count($rows); $index++) {
            $current = $rows[$index];
            $following = $rows[$index + 1] ?? null;

            if ($following !== null && collect([$current['status'], $following['status']])->sort()->values()->all() === ['insertion', 'omission']) {
                $omission = $current['status'] === 'omission' ? $current : $following;
                $insertion = $current['status'] === 'insertion' ? $current : $following;
                $merged[] = [
                    'status' => 'substitution',
                    'expected' => $omission['expected'],
                    'recognized' => $insertion['recognized'],
                ];
                $index++;

                continue;
            }

            $merged[] = $current;
        }

        return $merged;
    }
}
