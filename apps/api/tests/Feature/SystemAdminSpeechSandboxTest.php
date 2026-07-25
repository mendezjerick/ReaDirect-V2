<?php

namespace Tests\Feature;

use App\Models\EquivalenceRule;
use App\Models\SpeechSandboxAttempt;
use App\Models\StaffUser;
use App\Services\SpeechConfusionMatrix;
use App\Services\SpeechProcessingSettings;
use Database\Seeders\LetterEquivalenceSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class SystemAdminSpeechSandboxTest extends TestCase
{
    public function test_system_admin_can_read_real_model_status(): void
    {
        $admin = $this->systemAdministrator();
        Http::fake([
            '*/models/status' => Http::response([
                'mu' => ['available' => true, 'model' => 'mu'],
            ]),
        ]);

        $this->getJson("/api/staff/system-admin/{$admin->id}/speech/status")
            ->assertOk()
            ->assertJsonPath('nu.model', 'nu')
            ->assertJsonPath('nu.resolver', 'strict_letter_alias_v2')
            ->assertJsonPath('mu.model', 'mu');
    }

    public function test_true_sandbox_catalog_contains_only_mu_spoken_activity_targets(): void
    {
        $admin = $this->systemAdministrator();

        $response = $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/content-catalog",
        )->assertOk()
            ->assertJsonPath('summary.total_items', 106)
            ->assertJsonPath('summary.assessment_items', 12)
            ->assertJsonPath('summary.lesson_items', 94);

        $groups = collect($response->json('groups'));
        $this->assertSame([
            'assessment-task-2b',
            'assessment-task-3a',
            'lesson-2',
            'lesson-3',
            'lesson-4',
            'lesson-5',
            'lesson-6',
        ], $groups->pluck('key')->all());

        $items = $groups->pluck('items')->flatten(1);
        $this->assertTrue($items->contains('content_id', 'assessment-v1-task-2b-01'));
        $this->assertFalse($items->contains('content_id', 'lesson-v1-comprehension-who-lena'));
        $this->assertSame(
            'Lena at the Park',
            $items->firstWhere('content_id', 'assessment-v1-task-3a-story-1')['display_text'],
        );
        $this->assertFalse($items->contains('content_id', 'assessment-v1-task-2a-01'));
        $this->assertFalse($items->contains('content_id', 'assessment-v1-task-3b-story-1-who'));
        $this->assertFalse($items->contains('content_id', 'lesson-v1-letter-a'));
    }

    public function test_letter_equivalence_seeder_creates_the_complete_approved_baseline(): void
    {
        $this->systemAdministrator();

        app(LetterEquivalenceSeeder::class)->run();
        app(LetterEquivalenceSeeder::class)->run();

        $this->assertSame(79, EquivalenceRule::query()->count());
        $this->assertDatabaseHas('equivalence_rules', [
            'rule_type' => 'letter_alias',
            'expected_text' => 'U',
            'recognized_text' => 'you',
            'scope' => 'global',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('equivalence_rules', [
            'rule_type' => 'letter_alias',
            'expected_text' => 'I',
            'recognized_text' => 'aye',
            'scope' => 'global',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('equivalence_rules', [
            'rule_type' => 'letter_alias',
            'expected_text' => 'D',
            'recognized_text' => 'the',
            'scope' => 'global',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('equivalence_rules', [
            'rule_type' => 'letter_alias',
            'expected_text' => 'K',
            'recognized_text' => 'okay',
            'scope' => 'global',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('equivalence_rules', [
            'rule_type' => 'letter_alias',
            'expected_text' => 'R',
            'recognized_text' => 'arr',
            'scope' => 'global',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('equivalence_rules', [
            'rule_type' => 'letter_alias',
            'expected_text' => 'W',
            'recognized_text' => 'double you',
            'scope' => 'global',
            'is_active' => true,
        ]);
        $ambiguousAliases = EquivalenceRule::query()
            ->get(['expected_text', 'recognized_text'])
            ->groupBy('recognized_text')
            ->filter(fn ($rules): bool => $rules->pluck('expected_text')->unique()->count() > 1);
        $this->assertSame(['aye'], $ambiguousAliases->keys()->all());
        $this->assertEqualsCanonicalizing(
            ['A', 'I'],
            $ambiguousAliases->get('aye')->pluck('expected_text')->unique()->all(),
        );
    }

    public function test_letter_audio_is_forwarded_to_mu_with_equivalences_and_persisted(): void
    {
        $admin = $this->systemAdministrator();
        app(SpeechProcessingSettings::class)->setConditionalMuNoiseReduction(true);
        EquivalenceRule::query()->create([
            'rule_type' => 'letter_alias',
            'expected_text' => 'Z',
            'recognized_text' => 'rii',
            'scope' => 'global',
            'is_active' => true,
            'created_by_staff_user_id' => $admin->id,
        ]);
        Http::fake([
            '*/mu/resolve-letter' => Http::response([
                'ok' => true,
                'model' => 'nu',
                'engine' => 'mu',
                'predicted_class' => 'A',
                'decision' => 'CORRECT',
                'raw_transcript' => 'A',
            ]),
        ]);

        $response = $this->postJson("/api/staff/system-admin/{$admin->id}/speech/letter/resolve", [
            'audio' => UploadedFile::fake()->createWithContent('letter.wav', 'RIFF-test'),
            'expected_letter' => 'a',
        ])->assertOk()->assertJsonPath('decision', 'CORRECT');

        Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/mu/resolve-letter')
            && str_contains($request->body(), '"recognized_text":"rii"')
            && ! str_contains($request->body(), 'name="noise_reduction_enabled"'));
        $this->assertDatabaseHas('speech_sandbox_attempts', [
            'id' => $response->json('sandbox_attempt_id'),
            'staff_user_id' => $admin->id,
            'mode' => 'letter',
            'expected_value' => 'A',
            'service_status' => 200,
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $admin->id,
            'action_key' => 'speech_sandbox.letter_attempted',
        ]);
    }

    public function test_letter_distractor_metadata_is_validated_and_persisted(): void
    {
        $admin = $this->systemAdministrator();
        Http::fake([
            '*/mu/resolve-letter' => Http::response([
                'ok' => true,
                'model' => 'nu',
                'engine' => 'mu',
                'predicted_class' => 'UNKNOWN',
                'decision' => 'UNKNOWN',
                'raw_transcript' => 'background speech',
                'normalized_transcript' => 'background speech',
            ]),
        ]);

        $response = $this->postJson("/api/staff/system-admin/{$admin->id}/speech/letter/resolve", [
            'audio' => UploadedFile::fake()->createWithContent('noise.wav', 'RIFF-noise'),
            'expected_letter' => 'b',
            'distractor_audit_version' => SpeechConfusionMatrix::LETTER_NEGATIVE_AUDIT_VERSION,
            'ground_truth' => 'negative',
            'distractor_type' => 'fptn',
            'assigned_letter' => 'b',
        ])->assertOk();

        $attempt = SpeechSandboxAttempt::query()->findOrFail($response->json('sandbox_attempt_id'));
        $this->assertSame(SpeechConfusionMatrix::LETTER_NEGATIVE_AUDIT_VERSION, $attempt->request_metadata['distractor_audit_version']);
        $this->assertSame('negative', $attempt->request_metadata['ground_truth']);
        $this->assertSame('fptn', $attempt->request_metadata['distractor_type']);
        $this->assertSame('B', $attempt->request_metadata['assigned_letter']);
        $this->assertSame('letter', $attempt->request_metadata['task_type']);

        $this->postJson("/api/staff/system-admin/{$admin->id}/speech/letter/resolve", [
            'audio' => UploadedFile::fake()->createWithContent('noise.wav', 'RIFF-noise'),
            'expected_letter' => 'b',
            'distractor_audit_version' => SpeechConfusionMatrix::LETTER_NEGATIVE_AUDIT_VERSION,
            'ground_truth' => 'negative',
            'distractor_type' => 'fptn',
            'assigned_letter' => 'c',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('assigned_letter');
    }

    public function test_enabled_noise_reduction_is_forwarded_only_to_mu_requests(): void
    {
        $admin = $this->systemAdministrator();
        app(SpeechProcessingSettings::class)->setConditionalMuNoiseReduction(true);
        Http::fake([
            '*/mu/transcribe' => Http::response([
                'ok' => true,
                'model' => 'mu',
                'raw_transcript' => 'cat',
            ]),
        ]);

        $this->postJson("/api/staff/system-admin/{$admin->id}/speech/mu/transcribe", [
            'audio' => UploadedFile::fake()->createWithContent('word.wav', 'RIFF-test'),
            'expected_text' => 'cat',
            'task_type' => 'word',
        ])->assertOk();

        Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/mu/transcribe')
            && str_contains($request->body(), 'name="noise_reduction_enabled"')
            && str_contains($request->body(), "\r\n\r\ntrue\r\n"));
    }

    public function test_distractor_audit_forces_noise_reduction_off_and_stores_ground_truth(): void
    {
        $admin = $this->systemAdministrator();
        app(SpeechProcessingSettings::class)->setConditionalMuNoiseReduction(true);
        Http::fake([
            '*/mu/transcribe' => Http::response([
                'ok' => true,
                'model' => 'mu',
                'raw_transcript' => '',
                'comparison' => [
                    'exact_match' => false,
                    'differences' => [],
                ],
            ]),
        ]);

        $response = $this->postJson("/api/staff/system-admin/{$admin->id}/speech/mu/transcribe", [
            'audio' => UploadedFile::fake()->createWithContent('silence.wav', 'RIFF-test'),
            'expected_text' => 'cat',
            'task_type' => 'word',
            'item_key' => 'lesson-v1-word-cat',
            'distractor_audit_version' => SpeechConfusionMatrix::NEGATIVE_AUDIT_VERSION,
            'ground_truth' => 'negative',
            'distractor_type' => 'silence',
            'assigned_content_id' => 'lesson-v1-word-cat',
        ])->assertOk();

        Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/mu/transcribe')
            && str_contains($request->body(), 'name="noise_reduction_enabled"')
            && str_contains($request->body(), "\r\n\r\nfalse\r\n"));

        $attempt = SpeechSandboxAttempt::query()->findOrFail($response->json('sandbox_attempt_id'));
        $this->assertSame('negative', $attempt->request_metadata['ground_truth']);
        $this->assertSame('silence', $attempt->request_metadata['distractor_type']);
        $this->assertSame('false', $attempt->request_metadata['noise_reduction_enabled']);
    }

    public function test_mu_applies_an_active_item_scoped_token_equivalence(): void
    {
        $admin = $this->systemAdministrator();
        $rule = EquivalenceRule::query()->create([
            'rule_type' => 'token_alias',
            'expected_text' => 'cat',
            'recognized_text' => 'cap',
            'scope' => 'item',
            'item_key' => 'lesson-v3-phrase-fat-cat',
            'is_active' => true,
            'created_by_staff_user_id' => $admin->id,
        ]);
        Http::fake([
            '*/mu/transcribe' => Http::response([
                'ok' => true,
                'model' => 'mu',
                'raw_transcript' => 'the fat cap',
                'comparison' => [
                    'exact_match' => false,
                    'expected_word_count' => 3,
                    'recognized_word_count' => 3,
                    'matched_word_count' => 2,
                    'differences' => [],
                ],
            ]),
        ]);

        $response = $this->postJson("/api/staff/system-admin/{$admin->id}/speech/mu/transcribe", [
            'audio' => UploadedFile::fake()->createWithContent('phrase.wav', 'RIFF-test'),
            'expected_text' => 'the fat cat',
            'task_type' => 'phrase',
            'item_key' => 'lesson-v3-phrase-fat-cat',
            'fixture_set' => 'millie2-plus',
            'fixture_audit_version' => 'two-voice-item-token-v1',
        ])->assertOk()
            ->assertJsonPath('equivalence_resolution.accepted_match', true)
            ->assertJsonPath('equivalence_resolution.resolution_source', 'token_equivalence')
            ->assertJsonPath('equivalence_resolution.equivalent_word_count', 1)
            ->assertJsonPath('equivalence_resolution.differences.2.status', 'equivalent')
            ->assertJsonPath('equivalence_resolution.equivalence_rule_ids.0', $rule->id);

        $attempt = SpeechSandboxAttempt::query()->findOrFail($response->json('sandbox_attempt_id'));
        $this->assertSame('lesson-v3-phrase-fat-cat', $attempt->request_metadata['item_key']);
        $this->assertSame('millie2-plus', $attempt->request_metadata['fixture_set']);

        $this->postJson(
            "/api/staff/system-admin/{$admin->id}/speech/attempts/{$attempt->id}/review",
            ['review_outcome' => 'expected_correct'],
        )->assertOk()
            ->assertJsonPath('attempt.review_outcome', 'expected_correct');
    }

    public function test_token_aliases_must_be_different_single_words_scoped_to_an_item(): void
    {
        $admin = $this->systemAdministrator();
        $payload = [
            'review_outcome' => 'expected_correct',
            'rule_type' => 'token_alias',
            'expected_text' => 'Cat.',
            'recognized_text' => 'Cap!',
            'scope' => 'global',
        ];

        $this->postJson("/api/staff/system-admin/{$admin->id}/equivalence-rules", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('scope');

        $payload['scope'] = 'item';
        $payload['item_key'] = 'lesson-v3-phrase-fat-cat';
        $this->postJson("/api/staff/system-admin/{$admin->id}/equivalence-rules", $payload)
            ->assertCreated()
            ->assertJsonPath('created', true)
            ->assertJsonPath('rule.expected_text', 'cat')
            ->assertJsonPath('rule.recognized_text', 'cap');
    }

    public function test_only_expected_correct_review_can_create_an_equivalence_rule(): void
    {
        $admin = $this->systemAdministrator();
        $payload = [
            'review_outcome' => 'expected_wrong',
            'rule_type' => 'accepted_variant',
            'expected_text' => 'Lena has a bag',
            'recognized_text' => 'lena has bag',
            'scope' => 'global',
        ];

        $this->postJson("/api/staff/system-admin/{$admin->id}/equivalence-rules", $payload)
            ->assertUnprocessable();

        $payload['review_outcome'] = 'expected_correct';
        $this->postJson("/api/staff/system-admin/{$admin->id}/equivalence-rules", $payload)
            ->assertCreated()
            ->assertJsonPath('rule.rule_type', 'accepted_variant');
    }

    public function test_reviewed_wrong_letter_result_creates_a_letter_equivalence(): void
    {
        $admin = $this->systemAdministrator();
        Http::fake([
            '*/mu/resolve-letter' => Http::response([
                'ok' => true,
                'model' => 'nu',
                'engine' => 'mu',
                'predicted_class' => 'UNKNOWN',
                'decision' => 'UNKNOWN',
                'raw_transcript' => 'Rii',
            ]),
        ]);
        $attempt = $this->postJson("/api/staff/system-admin/{$admin->id}/speech/letter/resolve", [
            'audio' => UploadedFile::fake()->createWithContent('letter.wav', 'RIFF-test'),
            'expected_letter' => 'Z',
        ])->assertOk()->json('sandbox_attempt_id');

        $this->postJson("/api/staff/system-admin/{$admin->id}/equivalence-rules", [
            'review_outcome' => 'expected_correct',
            'rule_type' => 'letter_alias',
            'expected_text' => 'Z',
            'recognized_text' => 'Rii',
            'scope' => 'global',
            'sandbox_attempt_id' => $attempt,
        ])->assertCreated()
            ->assertJsonPath('rule.rule_type', 'letter_alias')
            ->assertJsonPath('rule.recognized_text', 'rii');

        $this->assertDatabaseHas('speech_sandbox_attempts', [
            'id' => $attempt,
            'review_outcome' => 'expected_correct',
        ]);
        $this->assertDatabaseHas('equivalence_rules', [
            'expected_text' => 'Z',
            'recognized_text' => 'rii',
            'rule_type' => 'letter_alias',
        ]);
    }

    public function test_system_admin_can_open_and_toggle_the_equivalence_book(): void
    {
        $admin = $this->systemAdministrator();
        $rule = EquivalenceRule::query()->create([
            'rule_type' => 'accepted_variant',
            'expected_text' => 'a red bag',
            'recognized_text' => 'a read bag',
            'scope' => 'global',
            'is_active' => true,
            'created_by_staff_user_id' => $admin->id,
        ]);

        $this->getJson("/api/staff/system-admin/{$admin->id}/equivalence-rules")
            ->assertOk()
            ->assertJsonPath('summary.total', 1)
            ->assertJsonPath('summary.active', 1)
            ->assertJsonPath('rules.0.id', $rule->id)
            ->assertJsonPath('rules.0.created_by', 'Speech Administrator');

        $this->patchJson(
            "/api/staff/system-admin/{$admin->id}/equivalence-rules/{$rule->id}",
            ['is_active' => false],
        )->assertOk()
            ->assertJsonPath('rule.is_active', false);

        $this->assertDatabaseHas('equivalence_rules', [
            'id' => $rule->id,
            'is_active' => false,
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $admin->id,
            'action_key' => 'equivalence_rule.status_updated',
        ]);
    }

    private function systemAdministrator(): StaffUser
    {
        $systemAdministrator = StaffUser::query()->create([
            'username' => 'speech-admin',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'Speech Administrator',
            'is_active' => true,
        ]);

        $this->authenticateStaff($systemAdministrator);

        return $systemAdministrator;
    }
}
