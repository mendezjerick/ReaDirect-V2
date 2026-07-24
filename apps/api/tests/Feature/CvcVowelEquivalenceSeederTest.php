<?php

namespace Tests\Feature;

use App\Models\EquivalenceRule;
use App\Models\StaffUser;
use App\Services\CvcVowelEquivalenceCatalog;
use App\Services\SpeechEquivalenceResolver;
use Database\Seeders\CvcVowelEquivalenceSeeder;
use Tests\TestCase;

final class CvcVowelEquivalenceSeederTest extends TestCase
{
    public function test_catalog_generates_only_a_o_u_cvc_variants_for_runtime_item_keys(): void
    {
        $rules = collect(app(CvcVowelEquivalenceCatalog::class)->rules());

        $this->assertCount(208, $rules);
        $this->assertTrue($rules->contains(fn (array $rule): bool => $rule === [
            'expected_text' => 'cap',
            'recognized_text' => 'cup',
            'scope' => 'item',
            'item_key' => 'task-2b-02',
            'source_group' => 'assessment-task-2b',
        ]));
        $this->assertTrue($rules->contains(
            fn (array $rule): bool => $rule['expected_text'] === 'cat'
                && $rule['recognized_text'] === 'cut'
                && $rule['item_key'] === 'lesson-v1-word-cat',
        ));
        $this->assertTrue($rules->contains(
            fn (array $rule): bool => $rule['expected_text'] === 'cut'
                && $rule['recognized_text'] === 'cat'
                && $rule['item_key'] === 'lesson-v1-word-cut',
        ));
        $this->assertFalse($rules->contains(
            fn (array $rule): bool => in_array(
                $rule['recognized_text'][1],
                ['e', 'i'],
                true,
            ),
        ));
    }

    public function test_seeder_resolves_a_o_u_but_preserves_e_and_i(): void
    {
        $administrator = $this->systemAdministrator();
        EquivalenceRule::query()->create([
            'rule_type' => 'token_alias',
            'expected_text' => 'mat',
            'recognized_text' => 'map',
            'scope' => 'item',
            'item_key' => 'lesson-v1-phrase-a-cat-on-a-mat',
            'notes' => 'Automatically observed in a known-correct two-voice Mu fixture audit. Evidence variant: jz.',
            'is_active' => false,
            'created_by_staff_user_id' => $administrator->id,
        ]);

        (new CvcVowelEquivalenceSeeder)->run();
        $resolver = app(SpeechEquivalenceResolver::class);

        $this->assertTrue($resolver->resolve(
            'cap',
            'cup',
            'lesson-v1-word-cap',
        )['accepted_match']);
        $this->assertTrue($resolver->resolve(
            'cat',
            'cot',
            'lesson-v1-word-cat',
        )['accepted_match']);
        $this->assertTrue($resolver->resolve(
            'cat',
            'cut',
            'lesson-v1-word-cat',
        )['accepted_match']);
        $this->assertTrue($resolver->resolve(
            'cut',
            'cat',
            'lesson-v1-word-cut',
        )['accepted_match']);
        $this->assertFalse($resolver->resolve(
            'cat',
            'cit',
            'lesson-v1-word-cat',
        )['accepted_match']);
        $this->assertFalse($resolver->resolve(
            'pen',
            'pin',
            'lesson-v1-word-pen',
        )['accepted_match']);
        $this->assertFalse($resolver->resolve(
            'cap',
            'cup',
            'lesson-v1-word-cat',
        )['accepted_match']);
        $this->assertDatabaseHas('equivalence_rules', [
            'expected_text' => 'mat',
            'recognized_text' => 'map',
            'item_key' => 'lesson-v1-phrase-a-cat-on-a-mat',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'action_key' => 'equivalence_rule.cvc_aou_baseline_seeded',
        ]);

        (new CvcVowelEquivalenceSeeder)->run();
        $this->assertSame(209, EquivalenceRule::query()->count());
    }

    private function systemAdministrator(): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'cvc-admin',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'CVC Administrator',
            'is_active' => true,
        ]);
    }
}
