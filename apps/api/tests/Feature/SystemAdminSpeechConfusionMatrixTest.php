<?php

namespace Tests\Feature;

use App\Models\SpeechSandboxAttempt;
use App\Models\StaffUser;
use App\Services\SpeechConfusionMatrix;
use Tests\TestCase;

final class SystemAdminSpeechConfusionMatrixTest extends TestCase
{
    public function test_system_admin_can_read_the_raw_fixture_confusion_matrix(): void
    {
        $admin = $this->systemAdministrator();
        $this->attempt($admin, 'millie2-plus', 'phrase', 'a cat', false, [
            ['status' => 'match', 'expected' => 'a', 'recognized' => 'a'],
            ['status' => 'substitution', 'expected' => 'cat', 'recognized' => 'cap'],
        ]);
        $this->attempt($admin, 'millie2', 'word', 'cat', true, [
            ['status' => 'match', 'expected' => 'cat', 'recognized' => 'cat'],
        ]);
        $this->attempt($admin, 'millie2-plus', 'sentence', 'is', false, [
            ['status' => 'omission', 'expected' => 'is', 'recognized' => ''],
        ]);
        $this->negativeAttempt($admin, 'fptn', 'cat', true);
        $this->negativeAttempt($admin, 'fptn', 'cap', false);
        $this->negativeAttempt($admin, 'silence', 'gum', false);

        $response = $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw",
        )->assertOk()
            ->assertJsonPath('mode', 'raw')
            ->assertJsonPath('audit_version', SpeechConfusionMatrix::AUDIT_VERSION)
            ->assertJsonPath('letter_audit_version', SpeechConfusionMatrix::LETTER_AUDIT_VERSION)
            ->assertJsonPath('summary.attempts', 3)
            ->assertJsonPath('summary.exact_attempts', 1)
            ->assertJsonPath('summary.mismatched_attempts', 2)
            ->assertJsonPath('summary.expected_tokens', 4)
            ->assertJsonPath('summary.matched_tokens', 2)
            ->assertJsonPath('summary.substitutions', 1)
            ->assertJsonPath('summary.omissions', 1)
            ->assertJsonPath('summary.insertions', 0)
            ->assertJsonPath('summary.raw_token_accuracy', 0.5)
            ->assertJsonPath('binary_classification.positive_attempts', 3)
            ->assertJsonPath('binary_classification.negative_attempts', 3)
            ->assertJsonPath('binary_classification.true_positives', 1)
            ->assertJsonPath('binary_classification.true_negatives', 2)
            ->assertJsonPath('binary_classification.false_positives', 1)
            ->assertJsonPath('binary_classification.false_negatives', 2)
            ->assertJsonPath('binary_classifications.content.true_positives', 1)
            ->assertJsonPath('binary_classifications.content.true_negatives', 2)
            ->assertJsonPath('binary_classifications.letter.positive_attempts', 0)
            ->assertJsonPath('binary_classification.accuracy', 0.5)
            ->assertJsonPath('binary_classification.precision', 0.5)
            ->assertJsonPath('binary_classification.recall', 0.3333)
            ->assertJsonPath('binary_classification.specificity', 0.6667)
            ->assertJsonPath('binary_classification.f1_score', 0.4)
            ->assertJsonPath('binary_classification.negative_sources.fptn.attempts', 2)
            ->assertJsonPath('binary_classification.negative_sources.silence.true_negatives', 1);

        $cells = collect($response->json('cells'));
        $this->assertSame(1, $cells->first(fn (array $cell): bool => $cell['expected'] === 'cat'
            && $cell['recognized'] === 'cap')['count']);
        $this->assertSame(1, $cells->first(fn (array $cell): bool => $cell['expected'] === 'is'
            && $cell['recognized'] === SpeechConfusionMatrix::EMPTY_TOKEN)['count']);
    }

    public function test_binary_matrix_ignores_unreviewed_and_unrelated_attempts(): void
    {
        $admin = $this->systemAdministrator();
        $positive = $this->attempt($admin, 'millie2', 'word', 'cat', true, [
            ['status' => 'match', 'expected' => 'cat', 'recognized' => 'cat'],
        ]);
        $positive->update(['review_outcome' => null]);
        $negative = $this->negativeAttempt($admin, 'fptn', 'cat', true);
        $negative->update(['review_outcome' => null]);

        $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw",
        )->assertOk()
            ->assertJsonPath('summary.attempts', 1)
            ->assertJsonPath('binary_classification.positive_attempts', 0)
            ->assertJsonPath('binary_classification.negative_attempts', 0)
            ->assertJsonPath('binary_classification.accuracy', 0);
    }

    public function test_raw_matrix_filters_by_fixture_set_and_task_type(): void
    {
        $admin = $this->systemAdministrator();
        $this->attempt($admin, 'millie2', 'word', 'cat', true, [
            ['status' => 'match', 'expected' => 'cat', 'recognized' => 'cat'],
        ]);
        $this->attempt($admin, 'millie2-plus', 'phrase', 'a cat', false, [
            ['status' => 'match', 'expected' => 'a', 'recognized' => 'a'],
            ['status' => 'substitution', 'expected' => 'cat', 'recognized' => 'cap'],
        ]);
        $this->attempt($admin, 'jz', 'word', 'bag', true, [
            ['status' => 'match', 'expected' => 'bag', 'recognized' => 'bag'],
        ]);
        $this->attempt($admin, 'shai', 'word', 'cap', true, [
            ['status' => 'match', 'expected' => 'cap', 'recognized' => 'cap'],
        ]);

        $response = $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw?fixture_set=millie2&task_type=word",
        )->assertOk()
            ->assertJsonPath('selected_filters.fixture_set', 'millie2')
            ->assertJsonPath('selected_filters.task_type', 'word')
            ->assertJsonPath('summary.attempts', 1)
            ->assertJsonPath('summary.exact_attempts', 1)
            ->assertJsonCount(1, 'cells');

        $this->assertContains('jz', $response->json('available_filters.fixture_sets'));
        $this->assertContains('shai', $response->json('available_filters.fixture_sets'));
    }

    public function test_raw_matrix_retains_legacy_two_voice_content_attempts(): void
    {
        $admin = $this->systemAdministrator();
        $attempt = $this->attempt($admin, 'millie2', 'word', 'cat', true, [
            ['status' => 'match', 'expected' => 'cat', 'recognized' => 'cat'],
        ]);
        $metadata = $attempt->request_metadata;
        $metadata['fixture_audit_version'] = SpeechConfusionMatrix::LEGACY_CONTENT_AUDIT_VERSION;
        $attempt->update(['request_metadata' => $metadata]);

        $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw",
        )->assertOk()
            ->assertJsonPath('audit_version', SpeechConfusionMatrix::AUDIT_VERSION)
            ->assertJsonPath('summary.attempts', 1)
            ->assertJsonPath('summary.exact_attempts', 1);
    }

    public function test_raw_matrix_includes_isolated_letter_fixture_attempts(): void
    {
        $admin = $this->systemAdministrator();
        $this->letterAttempt($admin, 'shai', 'A', 'ei');
        $this->letterAttempt($admin, 'jz', 'B', 'b');
        $this->letterNegativeAttempt($admin, 'fptn', 'A', 'a');
        $this->letterNegativeAttempt($admin, 'fptn', 'B', 'background speech');
        $this->letterNegativeAttempt($admin, 'silence', 'C', '');

        $response = $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw",
        )->assertOk()
            ->assertJsonPath('summary.attempts', 2)
            ->assertJsonPath('summary.exact_attempts', 1)
            ->assertJsonPath('summary.mismatched_attempts', 1)
            ->assertJsonPath('summary.expected_tokens', 2)
            ->assertJsonPath('summary.matched_tokens', 1)
            ->assertJsonPath('summary.substitutions', 1)
            ->assertJsonPath('binary_classification.positive_attempts', 2)
            ->assertJsonPath('binary_classification.negative_attempts', 3)
            ->assertJsonPath('binary_classification.true_positives', 1)
            ->assertJsonPath('binary_classification.true_negatives', 2)
            ->assertJsonPath('binary_classification.false_positives', 1)
            ->assertJsonPath('binary_classification.false_negatives', 1)
            ->assertJsonPath('binary_classifications.letter.scope', 'letter')
            ->assertJsonPath('binary_classifications.letter.positive_attempts', 2)
            ->assertJsonPath('binary_classifications.letter.negative_attempts', 3)
            ->assertJsonPath('binary_classifications.letter.true_positives', 1)
            ->assertJsonPath('binary_classifications.letter.true_negatives', 2)
            ->assertJsonPath('binary_classifications.letter.false_positives', 1)
            ->assertJsonPath('binary_classifications.letter.false_negatives', 1)
            ->assertJsonPath('binary_classifications.content.positive_attempts', 0);

        $this->assertContains('letter', $response->json('available_filters.task_types'));
        $this->assertContains('jz', $response->json('available_filters.fixture_sets'));
        $this->assertContains('shai', $response->json('available_filters.fixture_sets'));
        $this->assertSame(1, collect($response->json('cells'))->first(
            fn (array $cell): bool => $cell['expected'] === 'a' && $cell['recognized'] === 'ei',
        )['count']);

        $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw?fixture_set=shai&task_type=letter",
        )->assertOk()
            ->assertJsonPath('summary.attempts', 1)
            ->assertJsonPath('summary.mismatched_attempts', 1)
            ->assertJsonCount(1, 'cells');
    }

    /** @param list<array{status: string, expected: string, recognized: string}> $differences */
    private function attempt(
        StaffUser $admin,
        string $fixtureSet,
        string $taskType,
        string $expected,
        bool $exact,
        array $differences,
    ): SpeechSandboxAttempt {
        return SpeechSandboxAttempt::query()->create([
            'staff_user_id' => $admin->id,
            'mode' => SpeechSandboxAttempt::MODE_GENERAL,
            'expected_value' => $expected,
            'audio_path' => 'speech-sandbox/test.wav',
            'audio_original_name' => 'test.wav',
            'audio_mime_type' => 'audio/wav',
            'audio_size_bytes' => 12,
            'audio_sha256' => hash('sha256', $fixtureSet.$taskType.$expected),
            'service_status' => 200,
            'request_metadata' => [
                'fixture_audit_version' => SpeechConfusionMatrix::AUDIT_VERSION,
                'fixture_set' => $fixtureSet,
                'task_type' => $taskType,
            ],
            'service_response' => [
                'comparison' => [
                    'exact_match' => $exact,
                    'differences' => $differences,
                ],
            ],
            'review_outcome' => 'expected_correct',
        ]);
    }

    private function negativeAttempt(
        StaffUser $admin,
        string $distractorType,
        string $expected,
        bool $exact,
    ): SpeechSandboxAttempt {
        return SpeechSandboxAttempt::query()->create([
            'staff_user_id' => $admin->id,
            'mode' => SpeechSandboxAttempt::MODE_GENERAL,
            'expected_value' => $expected,
            'audio_path' => 'speech-sandbox/negative.wav',
            'audio_original_name' => 'negative.wav',
            'audio_mime_type' => 'audio/wav',
            'audio_size_bytes' => 12,
            'audio_sha256' => hash('sha256', $distractorType.$expected),
            'service_status' => 200,
            'request_metadata' => [
                'distractor_audit_version' => SpeechConfusionMatrix::NEGATIVE_AUDIT_VERSION,
                'ground_truth' => 'negative',
                'distractor_type' => $distractorType,
                'assigned_content_id' => 'content-'.$expected,
                'task_type' => 'word',
            ],
            'service_response' => [
                'comparison' => [
                    'exact_match' => $exact,
                    'differences' => [],
                ],
            ],
            'review_outcome' => 'expected_wrong',
        ]);
    }

    private function letterAttempt(
        StaffUser $admin,
        string $fixtureSet,
        string $expected,
        string $recognized,
    ): SpeechSandboxAttempt {
        return SpeechSandboxAttempt::query()->create([
            'staff_user_id' => $admin->id,
            'mode' => SpeechSandboxAttempt::MODE_LETTER,
            'expected_value' => $expected,
            'audio_path' => 'speech-sandbox/letter.wav',
            'audio_original_name' => 'letter.wav',
            'audio_mime_type' => 'audio/wav',
            'audio_size_bytes' => 12,
            'audio_sha256' => hash('sha256', $fixtureSet.$expected.$recognized),
            'service_status' => 200,
            'request_metadata' => [
                'fixture_audit_version' => SpeechConfusionMatrix::LETTER_AUDIT_VERSION,
                'fixture_set' => $fixtureSet,
                'task_type' => 'letter',
            ],
            'service_response' => [
                'raw_transcript' => $recognized,
                'normalized_transcript' => $recognized,
                'decision' => mb_strtolower($expected) === $recognized ? 'CORRECT' : 'UNKNOWN',
            ],
            'review_outcome' => 'expected_correct',
        ]);
    }

    private function letterNegativeAttempt(
        StaffUser $admin,
        string $distractorType,
        string $expected,
        string $recognized,
    ): SpeechSandboxAttempt {
        return SpeechSandboxAttempt::query()->create([
            'staff_user_id' => $admin->id,
            'mode' => SpeechSandboxAttempt::MODE_LETTER,
            'expected_value' => $expected,
            'audio_path' => 'speech-sandbox/letter-negative.wav',
            'audio_original_name' => 'letter-negative.wav',
            'audio_mime_type' => 'audio/wav',
            'audio_size_bytes' => 12,
            'audio_sha256' => hash('sha256', $distractorType.$expected.$recognized),
            'service_status' => 200,
            'request_metadata' => [
                'distractor_audit_version' => SpeechConfusionMatrix::LETTER_NEGATIVE_AUDIT_VERSION,
                'ground_truth' => 'negative',
                'distractor_type' => $distractorType,
                'assigned_letter' => $expected,
                'task_type' => 'letter',
            ],
            'service_response' => [
                'raw_transcript' => $recognized,
                'normalized_transcript' => $recognized,
                'decision' => mb_strtolower($expected) === $recognized ? 'CORRECT' : 'UNKNOWN',
            ],
            'review_outcome' => 'expected_wrong',
        ]);
    }

    private function systemAdministrator(): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'matrix-admin',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'Matrix Administrator',
            'is_active' => true,
        ]);
    }
}
