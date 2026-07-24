<?php

namespace Database\Seeders;

use App\Models\EquivalenceRule;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\CvcVowelEquivalenceCatalog;
use Illuminate\Database\Seeder;
use RuntimeException;

final class CvcVowelEquivalenceSeeder extends Seeder
{
    public const NOTES_PREFIX = '[system:cvc-aou-v1]';

    public function run(): void
    {
        $systemAdministrator = StaffUser::query()
            ->where('role', 'system_admin')
            ->where('is_active', true)
            ->oldest('id')
            ->first();
        if ($systemAdministrator === null) {
            throw new RuntimeException(
                'A System Administrator is required before seeding CVC vowel equivalences.',
            );
        }

        EquivalenceRule::query()
            ->where('rule_type', 'token_alias')
            ->where('notes', 'like', self::NOTES_PREFIX.'%')
            ->update(['is_active' => false]);

        $created = 0;
        $reused = 0;
        foreach (app(CvcVowelEquivalenceCatalog::class)->rules() as $definition) {
            $rule = EquivalenceRule::query()->firstOrCreate([
                'rule_type' => 'token_alias',
                'expected_text' => $definition['expected_text'],
                'recognized_text' => $definition['recognized_text'],
                'scope' => 'item',
                'item_key' => $definition['item_key'],
            ], [
                'notes' => self::NOTES_PREFIX
                    .' Inclusive Philippine-English CVC scoring: the middle '
                    .'vowels a, o, and u are equivalent when both consonants match. '
                    ."Source: {$definition['source_group']}.",
                'is_active' => true,
                'created_by_staff_user_id' => $systemAdministrator->id,
            ]);

            $rule->forceFill(['is_active' => true])->save();
            $rule->wasRecentlyCreated ? $created++ : $reused++;
        }

        $reactivatedFixtureRules = EquivalenceRule::query()
            ->where('rule_type', 'token_alias')
            ->where('is_active', false)
            ->where('notes', 'like', 'Automatically observed in a known-correct%fixture audit.%')
            ->update(['is_active' => true]);

        StaffAuditLog::query()->updateOrCreate([
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'equivalence_rule.cvc_aou_baseline_seeded',
        ], [
            'description' => 'Prepared the CVC a/o/u middle-vowel equivalence baseline.',
            'metadata' => [
                'generated_rule_count' => $created + $reused,
                'created_rule_count' => $created,
                'reused_rule_count' => $reused,
                'reactivated_fixture_rule_count' => $reactivatedFixtureRules,
                'middle_vowel_family' => ['a', 'o', 'u'],
                'scope' => 'item',
            ],
        ]);
    }
}
