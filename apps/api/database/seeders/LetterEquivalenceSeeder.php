<?php

namespace Database\Seeders;

use App\Models\EquivalenceRule;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Database\Seeder;
use RuntimeException;

final class LetterEquivalenceSeeder extends Seeder
{
    /** @var array<string, list<string>> */
    private const STANDARD_ALIASES = [
        'A' => ['a', 'ay', 'aye', 'hey', 'ei'],
        'B' => ['b', 'be', 'bee'],
        'C' => ['c', 'see', 'sea', 'si'],
        'D' => ['d', 'dee'],
        'E' => ['e'],
        'F' => ['f', 'ef', 'eff'],
        'G' => ['g', 'gee'],
        'H' => ['h', 'aitch', 'eitch'],
        'I' => ['i', 'eye'],
        'J' => ['j', 'jay'],
        'K' => ['k', 'kay'],
        'L' => ['l', 'el', 'ell'],
        'M' => ['m', 'em'],
        'N' => ['n', 'en'],
        'O' => ['o', 'oh'],
        'P' => ['p', 'pea', 'pee'],
        'Q' => ['q', 'cue', 'queue'],
        'R' => ['r', 'are', 'ar'],
        'S' => ['s', 'ess'],
        'T' => ['t', 'tea', 'tee'],
        'U' => ['u', 'you', 'yew'],
        'V' => ['v', 'vee'],
        'W' => ['w', 'double u', 'double you'],
        'X' => ['x', 'ex'],
        'Y' => ['y', 'why'],
        'Z' => ['z', 'zee', 'zed'],
    ];

    /** @var array<string, list<string>> */
    private const FIXTURE_DERIVED_ALIASES = [
        'C' => ['seed', 'siiii'],
        'D' => ['the'],
        'I' => ['aiii', 'aye', 'ayy', 'ayyyy'],
        'K' => ['gay', 'okay'],
        'R' => ['arr'],
        'S' => ['ass'],
        'U' => ['eww'],
    ];

    public function run(): void
    {
        $systemAdministrator = StaffUser::query()
            ->where('role', 'system_admin')
            ->where('is_active', true)
            ->oldest('id')
            ->first();
        if ($systemAdministrator === null) {
            throw new RuntimeException('A System Administrator is required before seeding letter equivalences.');
        }

        $standardCount = $this->seedAliases(
            self::STANDARD_ALIASES,
            $systemAdministrator,
            'System baseline for strict isolated-letter resolution.',
        );
        $fixtureDerivedCount = $this->seedAliases(
            self::FIXTURE_DERIVED_ALIASES,
            $systemAdministrator,
            'Generated from confirmed-correct isolated-letter fixtures after Mu false-negative review.',
        );

        StaffAuditLog::query()->updateOrCreate([
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'equivalence_rule.letter_baseline_seeded',
        ], [
            'description' => 'Prepared the system baseline of isolated-letter equivalences.',
            'metadata' => [
                'rule_count' => $standardCount + $fixtureDerivedCount,
                'standard_rule_count' => $standardCount,
                'fixture_derived_rule_count' => $fixtureDerivedCount,
                'approved_ambiguous_aliases' => ['aye' => ['A', 'I']],
                'letter_count' => count(self::STANDARD_ALIASES),
            ],
        ]);
    }

    /**
     * @param  array<string, list<string>>  $aliasesByLetter
     */
    private function seedAliases(
        array $aliasesByLetter,
        StaffUser $systemAdministrator,
        string $notes,
    ): int {
        $seeded = 0;
        foreach ($aliasesByLetter as $letter => $aliases) {
            foreach ($aliases as $alias) {
                EquivalenceRule::query()->updateOrCreate([
                    'rule_type' => 'letter_alias',
                    'expected_text' => $letter,
                    'recognized_text' => $alias,
                    'scope' => 'global',
                    'item_key' => null,
                ], [
                    'notes' => $notes,
                    'is_active' => true,
                    'created_by_staff_user_id' => $systemAdministrator->id,
                ]);
                $seeded++;
            }
        }

        return $seeded;
    }
}
