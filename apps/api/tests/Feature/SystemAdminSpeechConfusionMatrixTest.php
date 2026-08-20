<?php

namespace Tests\Feature;

use App\Models\SpeechSandboxAttempt;
use App\Models\StaffUser;
use App\Services\BundledSpeechAuditSource;
use App\Services\SpeechConfusionMatrix;
use Tests\TestCase;

final class SystemAdminSpeechConfusionMatrixTest extends TestCase
{
    public function test_system_admin_reads_the_fixed_bundled_fixture_confusion_matrix(): void
    {
        $admin = $this->systemAdministrator();

        $response = $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw",
        )->assertOk()
            ->assertJsonPath('mode', 'raw')
            ->assertJsonPath('source', 'bundled_fixture_audits')
            ->assertJsonPath('audit_version', BundledSpeechAuditSource::CONTENT_AUDIT_VERSION)
            ->assertJsonPath('letter_audit_version', BundledSpeechAuditSource::LETTER_AUDIT_VERSION)
            ->assertJsonPath('source_versions.content', BundledSpeechAuditSource::CONTENT_AUDIT_VERSION)
            ->assertJsonPath('source_versions.letters', BundledSpeechAuditSource::LETTER_AUDIT_VERSION)
            ->assertJsonPath('source_versions.content_negatives', BundledSpeechAuditSource::CONTENT_NEGATIVE_AUDIT_VERSION)
            ->assertJsonPath('source_versions.letter_negatives', BundledSpeechAuditSource::LETTER_NEGATIVE_AUDIT_VERSION)
            ->assertJsonPath('fixture_sources.sources.0.id', 'elevenlabs-filipino-childlike-female-voice-1')
            ->assertJsonPath('fixture_sources.sources.0.display_name', 'ElevenLabs child-like Filipino female voice 1')
            ->assertJsonPath('fixture_sources.sources.2.display_name', 'Jezreel R. Ramos')
            ->assertJsonPath('fixture_sources.sources.3.display_name', 'Shaila Patrice D. Avallenda')
            ->assertJsonPath('fixture_sources.negative.display_name', 'Kaggle negative fixture set')
            ->assertJsonPath('fixture_sources.negative.description', 'Known-negative noisy-speech and silence recordings sourced from the Kaggle dataset by abdullahhaydarkadolu.')
            ->assertJsonPath('summary.attempts', 542)
            ->assertJsonPath('summary.exact_attempts', 450)
            ->assertJsonPath('summary.mismatched_attempts', 92)
            ->assertJsonPath('summary.expected_tokens', 2482)
            ->assertJsonPath('summary.matched_tokens', 2376)
            ->assertJsonPath('summary.substitutions', 100)
            ->assertJsonPath('summary.omissions', 6)
            ->assertJsonPath('summary.insertions', 1)
            ->assertJsonPath('summary.raw_token_accuracy', 0.9573)
            ->assertJsonPath('binary_classification.positive_attempts', 542)
            ->assertJsonPath('binary_classification.negative_attempts', 564)
            ->assertJsonPath('binary_classification.true_positives', 480)
            ->assertJsonPath('binary_classification.true_negatives', 562)
            ->assertJsonPath('binary_classification.false_positives', 2)
            ->assertJsonPath('binary_classification.false_negatives', 62)
            ->assertJsonPath('binary_classification.accuracy', 0.9421)
            ->assertJsonPath('binary_classification.precision', 0.9959)
            ->assertJsonPath('binary_classification.recall', 0.8856)
            ->assertJsonPath('binary_classification.specificity', 0.9965)
            ->assertJsonPath('binary_classification.f1_score', 0.9375)
            ->assertJsonPath('binary_classification.negative_sources.fptn.attempts', 312)
            ->assertJsonPath('binary_classification.negative_sources.silence.true_negatives', 250)
            ->assertJsonPath('binary_classifications.content.true_positives', 403)
            ->assertJsonPath('binary_classifications.content.true_negatives', 282)
            ->assertJsonPath('binary_classifications.content.false_positives', 0)
            ->assertJsonPath('binary_classifications.content.false_negatives', 61)
            ->assertJsonPath('binary_classifications.letter.true_positives', 77)
            ->assertJsonPath('binary_classifications.letter.true_negatives', 280)
            ->assertJsonPath('binary_classifications.letter.false_positives', 2)
            ->assertJsonPath('binary_classifications.letter.false_negatives', 1);

        $this->assertSame(
            [
                'elevenlabs-filipino-childlike-female-voice-1',
                'elevenlabs-filipino-childlike-female-voice-2',
                'jezreel-r-ramos',
                'shaila-patrice-d-avallenda',
            ],
            $response->json('available_filters.fixture_sources'),
        );
        $this->assertSame(
            ['comprehension', 'letter', 'passage', 'phrase', 'sentence', 'word'],
            $response->json('available_filters.task_types'),
        );
        $this->assertNotEmpty($response->json('cells'));
        $this->assertNotEmpty($response->json('confusions'));
        $publicResponse = json_encode($response->json(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('"fixture_set"', $publicResponse);
        $this->assertStringNotContainsString('"millie2"', $publicResponse);
        $this->assertStringNotContainsString('"jz"', $publicResponse);
        $this->assertStringNotContainsString('"shai"', $publicResponse);
    }

    public function test_raw_matrix_filters_the_bundled_fixture_records(): void
    {
        $admin = $this->systemAdministrator();

        $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw?fixture_source=elevenlabs-filipino-childlike-female-voice-1&task_type=word",
        )->assertOk()
            ->assertJsonPath('selected_filters.fixture_source', 'elevenlabs-filipino-childlike-female-voice-1')
            ->assertJsonPath('selected_filters.task_type', 'word')
            ->assertJsonPath('summary.attempts', 59)
            ->assertJsonPath('summary.exact_attempts', 54)
            ->assertJsonPath('summary.mismatched_attempts', 5)
            ->assertJsonPath('summary.expected_tokens', 59)
            ->assertJsonPath('summary.matched_tokens', 54)
            ->assertJsonPath('summary.substitutions', 5)
            ->assertJsonPath('summary.raw_token_accuracy', 0.9153)
            ->assertJsonCount(52, 'cells')
            ->assertJsonCount(5, 'confusions');

        $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw?fixture_source=shaila-patrice-d-avallenda&task_type=letter",
        )->assertOk()
            ->assertJsonPath('summary.attempts', 26)
            ->assertJsonPath('summary.exact_attempts', 15)
            ->assertJsonPath('summary.mismatched_attempts', 11)
            ->assertJsonPath('summary.raw_token_accuracy', 0.5769)
            ->assertJsonCount(26, 'cells')
            ->assertJsonCount(11, 'confusions');
    }

    public function test_postgresql_sandbox_attempts_cannot_change_the_bundled_matrix(): void
    {
        $admin = $this->systemAdministrator();
        SpeechSandboxAttempt::query()->create([
            'staff_user_id' => $admin->id,
            'mode' => SpeechSandboxAttempt::MODE_GENERAL,
            'expected_value' => 'database-only-value',
            'audio_path' => 'speech-sandbox/database-only.wav',
            'audio_original_name' => 'database-only.wav',
            'audio_mime_type' => 'audio/wav',
            'audio_size_bytes' => 12,
            'audio_sha256' => hash('sha256', 'database-only-attempt'),
            'service_status' => 200,
            'request_metadata' => [
                'fixture_audit_version' => SpeechConfusionMatrix::AUDIT_VERSION,
                'fixture_set' => 'millie2',
                'task_type' => 'word',
            ],
            'service_response' => [
                'comparison' => [
                    'exact_match' => true,
                    'differences' => [[
                        'status' => 'match',
                        'expected' => 'database-only-value',
                        'recognized' => 'database-only-value',
                    ]],
                ],
            ],
            'review_outcome' => 'expected_correct',
        ]);

        $response = $this->getJson(
            "/api/staff/system-admin/{$admin->id}/speech/confusion-matrix/raw",
        )->assertOk()
            ->assertJsonPath('summary.attempts', 542)
            ->assertJsonPath('binary_classification.positive_attempts', 542)
            ->assertJsonPath('binary_classification.negative_attempts', 564);

        $this->assertNotContains(
            'database-only-value',
            $response->json('labels.expected'),
        );
    }

    private function systemAdministrator(): StaffUser
    {
        $systemAdministrator = StaffUser::query()->create([
            'username' => 'matrix-admin',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'Matrix Administrator',
            'is_active' => true,
        ]);

        $this->authenticateStaff($systemAdministrator);

        return $systemAdministrator;
    }
}
