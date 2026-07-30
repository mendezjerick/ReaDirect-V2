<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\School;
use App\Models\SpeechSandboxAttempt;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class SystemAdminOverviewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Http::fake([
            'http://127.0.0.1:8001/ready' => Http::response([
                'status' => 'ready',
                'service' => 'ReaDirect ASR',
                'mu' => ['available' => true],
            ]),
            'http://127.0.0.1:8002/health' => Http::response([
                'service' => 'tts',
                'status' => 'ready',
                'runtime_ready' => true,
                'model_ready' => true,
            ]),
        ]);
    }

    public function test_overview_returns_documented_system_sections(): void
    {
        $staffUser = StaffUser::query()->create([
            'username' => 'system-admin-test',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($staffUser);

        $school = School::query()->create([
            'name' => 'Northfield Elementary',
            'normalized_name' => 'northfield elementary',
        ]);
        $teacher = StaffUser::query()->create([
            'username' => 'northfield-teacher',
            'password' => 'local-test-password',
            'role' => 'teacher',
            'school_id' => $school->id,
            'display_name' => 'Northfield Teacher',
            'is_active' => true,
        ]);
        $learner = Learner::query()->create([
            'learner_code' => 'AA001',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'local-test-password',
            'first_name' => 'Ana',
            'middle_name' => '',
            'last_name' => 'Santos',
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'A',
            'is_active' => true,
        ]);
        $portalLearner = Learner::query()->create([
            'learner_code' => 'KW000',
            'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
            'password' => 'local-test-password',
            'first_name' => 'Kristen',
            'middle_name' => 'Rhine',
            'last_name' => 'Wright',
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Portal',
            'is_active' => true,
        ]);

        AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'complete',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'part_one_score' => 28,
            'part_one_level' => 'Grade Ready',
            'final_reading_score' => 25,
            'final_reading_profile' => 'Transitioning Reader',
            'part_one_completed_at' => now()->subMinutes(20),
            'assessment_completed_at' => now()->subMinutes(15),
        ]);
        AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_FINAL,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'complete',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'final_reading_score' => 29,
            'final_reading_profile' => 'Reading at Grade Level',
            'assessment_completed_at' => now()->subMinutes(5),
        ]);
        AssessmentRun::query()->create([
            'learner_id' => $portalLearner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'complete',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'part_one_level' => 'Full Refresher',
            'final_reading_profile' => 'Low Emerging Reader',
            'assessment_completed_at' => now(),
        ]);

        SpeechSandboxAttempt::query()->create([
            'staff_user_id' => $staffUser->id,
            'mode' => SpeechSandboxAttempt::MODE_GENERAL,
            'expected_value' => 'The learner reads.',
            'audio_path' => 'speech-sandbox/general/failure.wav',
            'audio_original_name' => 'failure.wav',
            'audio_mime_type' => 'audio/wav',
            'audio_size_bytes' => 64,
            'audio_sha256' => str_repeat('a', 64),
            'service_status' => 503,
            'service_response' => ['detail' => 'model unavailable'],
        ]);
        $voice = TtsVoiceVersion::query()->create([
            'stable_key' => 'clara-sh-v1',
            'engine' => 'voxcpm2',
            'model_identifier' => 'openbmb/voxcpm2',
            'reference_set' => 'clara-sh',
            'conditioning_version' => 'v1',
            'synthesis_config' => [],
            'status' => TtsVoiceVersion::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
        TtsSpeechLine::query()->create([
            'tts_voice_version_id' => $voice->id,
            'speech_key' => 'test-line',
            'text' => 'Ready.',
            'reference_role' => 'instruction',
            'audio_storage_disk' => 'tts_catalog',
            'audio_storage_path' => 'test-line.wav',
            'audio_sha256' => str_repeat('b', 64),
            'duration_ms' => 500,
            'status' => TtsSpeechLine::STATUS_PUBLISHED,
            'generated_at' => now(),
            'approved_at' => now(),
        ]);

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => 'system_admin.seeded',
            'description' => 'Development account prepared.',
        ]);

        $this->getJson('/api/staff/system-admin/overview')
            ->assertOk()
            ->assertJsonPath('metrics.total_schools', 1)
            ->assertJsonPath('metrics.total_teachers', 1)
            ->assertJsonPath('metrics.total_learners', 1)
            ->assertJsonPath('metrics.sandbox_attempts', 1)
            ->assertJsonPath('part_one_distribution.0.value', 0)
            ->assertJsonPath('part_one_distribution.3.value', 1)
            ->assertJsonPath('reading_profile_distribution.4.value', 1)
            ->assertJsonPath('speech_processing.conditional_mu_noise_reduction_enabled', false)
            ->assertJsonPath('speech_processing.default_mode', 'raw_first')
            ->assertJsonPath('system_health.0.status', 'online')
            ->assertJsonPath('system_health.2.service', 'ASR')
            ->assertJsonPath('system_health.2.status', 'online')
            ->assertJsonPath('system_health.3.service', 'TTS')
            ->assertJsonPath('system_health.3.status', 'online')
            ->assertJsonPath('system_health.4.status', 'online')
            ->assertJsonPath('recent_assessment_activity.0.learner_code', 'AA001')
            ->assertJsonPath('recent_assessment_activity.0.school_name', 'Northfield Elementary')
            ->assertJsonPath('recent_assessment_activity.0.assessment_label', 'Final Assessment')
            ->assertJsonCount(2, 'recent_assessment_activity')
            ->assertJsonPath('recent_speech_failures.0.source', 'True Sandbox')
            ->assertJsonPath('recent_speech_failures.0.status_code', 503)
            ->assertJsonPath('recent_actions.0.description', 'Development account prepared.')
            ->assertJsonStructure([
                'metrics',
                'part_one_distribution',
                'reading_profile_distribution',
                'system_health',
                'speech_processing',
                'recent_assessment_activity',
                'recent_speech_failures',
                'recent_actions',
                'generated_at',
            ]);
    }

    public function test_system_administrator_can_enable_and_disable_conditional_mu_noise_reduction(): void
    {
        $staffUser = StaffUser::query()->create([
            'username' => 'noise-admin-test',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($staffUser);

        $endpoint = "/api/staff/system-admin/{$staffUser->id}/speech-settings/mu-noise-reduction";

        $this->putJson($endpoint, ['enabled' => true])
            ->assertOk()
            ->assertJsonPath('speech_processing.conditional_mu_noise_reduction_enabled', true);
        $this->getJson('/api/staff/system-admin/overview')
            ->assertJsonPath('speech_processing.conditional_mu_noise_reduction_enabled', true);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $staffUser->id,
            'action_key' => 'speech.mu_noise_reduction_toggled',
            'description' => 'Enabled conditional Mu noise reduction.',
        ]);

        $this->putJson($endpoint, ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('speech_processing.conditional_mu_noise_reduction_enabled', false);
    }
}
