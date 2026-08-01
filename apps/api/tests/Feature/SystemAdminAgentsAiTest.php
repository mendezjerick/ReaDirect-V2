<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\StaffUser;
use App\Models\SystemSetting;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Tests\TestCase;

final class SystemAdminAgentsAiTest extends TestCase
{
    public function test_system_administrator_can_review_agent_runtime_contracts(): void
    {
        $this->authenticateStaff($this->systemAdministrator());
        $voice = $this->publishedVoice();
        $this->speechLine($voice, 'lesson-1-mission-1', 'instruction');
        $this->speechLine($voice, 'assessment-orientation', 'question');

        $this->getJson('/api/staff/system-admin/agents-ai/settings')
            ->assertOk()
            ->assertJsonPath('agent.name', "Ma'am Clara")
            ->assertJsonPath('agent.display.mode', 'Live2D')
            ->assertJsonPath('agent.typography.learner_interface', 'Jersey 20')
            ->assertJsonPath('agent.typography.authored_reading_content', 'Lexend')
            ->assertJsonPath('agent.voice.stable_key', 'clara-sh-v1')
            ->assertJsonPath('agent.voice.published_lines', 2)
            ->assertJsonPath('agent.speech_processing.mu_default_mode', 'raw_first')
            ->assertJsonPath('agent.speech_processing.nu_noise_reduction', false)
            ->assertJsonPath('agent.lightweight_mode.enabled', false)
            ->assertJsonPath('agent.lightweight_mode.static_clara', true)
            ->assertJsonPath('agent.lightweight_mode.published_speech_only', true)
            ->assertJsonPath('agent.lightweight_mode.display_mode', 'live2d')
            ->assertJsonPath('agent.lightweight_mode.speech_mode', 'hybrid')
            ->assertJsonPath('governance.read_only', true);
    }

    public function test_system_administrator_can_atomically_configure_lightweight_learner_mode(): void
    {
        $systemAdministrator = $this->systemAdministrator();
        $this->authenticateStaff($systemAdministrator);

        $this->putJson('/api/staff/system-admin/agents-ai/lightweight-mode', [
            'enabled' => true,
            'static_clara' => false,
            'published_speech_only' => true,
        ])
            ->assertOk()
            ->assertJsonPath('lightweight_mode.enabled', true)
            ->assertJsonPath('lightweight_mode.static_clara', false)
            ->assertJsonPath('lightweight_mode.published_speech_only', true)
            ->assertJsonPath('lightweight_mode.display_mode', 'live2d')
            ->assertJsonPath('lightweight_mode.speech_mode', 'published_only')
            ->assertJsonPath('lightweight_mode.applies_on_next_learner_load', true);

        $this->assertSame([
            'enabled' => true,
            'static_clara' => false,
            'published_speech_only' => true,
        ], SystemSetting::query()->where('key', 'learner.lightweight_mode')->value('value'));
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'learner.lightweight_mode_updated',
        ]);
    }

    public function test_disabling_both_lightweight_children_normalizes_the_master_switch_off(): void
    {
        $this->authenticateStaff($this->systemAdministrator());

        $this->putJson('/api/staff/system-admin/agents-ai/lightweight-mode', [
            'enabled' => true,
            'static_clara' => false,
            'published_speech_only' => false,
        ])
            ->assertOk()
            ->assertJsonPath('lightweight_mode.enabled', false)
            ->assertJsonPath('lightweight_mode.display_mode', 'live2d')
            ->assertJsonPath('lightweight_mode.speech_mode', 'hybrid');
    }

    public function test_lightweight_mode_requires_one_atomic_configuration_and_system_administrator_access(): void
    {
        $systemAdministrator = $this->systemAdministrator();
        $this->authenticateStaff($systemAdministrator);

        $this->putJson('/api/staff/system-admin/agents-ai/lightweight-mode', [
            'enabled' => true,
            'static_clara' => true,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('system_settings', [
            'key' => 'learner.lightweight_mode',
        ]);

        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-lightweight-mode-test',
            'password' => 'local-password',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($schoolAdministrator);

        $this->putJson('/api/staff/system-admin/agents-ai/lightweight-mode', [
            'enabled' => true,
            'static_clara' => true,
            'published_speech_only' => true,
        ])->assertForbidden();
    }

    public function test_system_administrator_can_review_published_clara_speech_templates(): void
    {
        $this->authenticateStaff($this->systemAdministrator());
        $voice = $this->publishedVoice();
        $this->speechLine($voice, 'assessment-orientation', 'instruction');
        $this->speechLine($voice, 'lesson-1-mission-1', 'instruction');
        $this->speechLine($voice, 'learn-with-clara-letters-find-a', 'question');

        $this->getJson('/api/staff/system-admin/agents-ai/prompt-templates')
            ->assertOk()
            ->assertJsonPath('summary.published_voice', 'clara-sh-v1')
            ->assertJsonPath('summary.published_templates', 3)
            ->assertJsonPath('summary.generative_prompt_registry_configured', false)
            ->assertJsonPath('templates.0.group', 'Assessments')
            ->assertJsonPath('templates.1.group', 'Learn with Clara')
            ->assertJsonPath('templates.2.group', 'Required lessons')
            ->assertJsonMissingPath('templates.0.audio_storage_path')
            ->assertJsonMissingPath('templates.0.audio_sha256')
            ->assertJsonPath('governance.read_only', true);
    }

    public function test_agents_and_ai_catalogs_are_restricted_to_system_administrators(): void
    {
        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-ai-test',
            'password' => 'local-password',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($schoolAdministrator);

        $this->getJson('/api/staff/system-admin/agents-ai/settings')->assertForbidden();
        $this->getJson('/api/staff/system-admin/agents-ai/prompt-templates')->assertForbidden();
    }

    private function systemAdministrator(): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'system-admin-ai-test',
            'password' => 'local-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
    }

    private function publishedVoice(): TtsVoiceVersion
    {
        return TtsVoiceVersion::query()->create([
            'stable_key' => 'clara-sh-v1',
            'engine' => 'VoxCPM2',
            'model_identifier' => 'openbmb/VoxCPM2',
            'reference_set' => 'sh',
            'conditioning_version' => 'v1',
            'synthesis_config' => [],
            'status' => TtsVoiceVersion::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
    }

    private function speechLine(
        TtsVoiceVersion $voice,
        string $speechKey,
        string $referenceRole,
    ): TtsSpeechLine {
        return TtsSpeechLine::query()->create([
            'tts_voice_version_id' => $voice->id,
            'speech_key' => $speechKey,
            'text' => "Approved line for {$speechKey}.",
            'reference_role' => $referenceRole,
            'audio_storage_disk' => 'tts_catalog',
            'audio_storage_path' => "{$speechKey}.wav",
            'audio_sha256' => hash('sha256', $speechKey),
            'duration_ms' => 500,
            'status' => TtsSpeechLine::STATUS_PUBLISHED,
            'generated_at' => now(),
            'approved_at' => now(),
        ]);
    }
}
