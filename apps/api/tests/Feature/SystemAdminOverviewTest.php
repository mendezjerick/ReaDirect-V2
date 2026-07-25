<?php

namespace Tests\Feature;

use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Tests\TestCase;

final class SystemAdminOverviewTest extends TestCase
{
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

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => 'system_admin.seeded',
            'description' => 'Development account prepared.',
        ]);

        $this->getJson('/api/staff/system-admin/overview')
            ->assertOk()
            ->assertJsonPath('metrics.total_schools', 0)
            ->assertJsonPath('metrics.total_teachers', 0)
            ->assertJsonPath('metrics.total_learners', 0)
            ->assertJsonPath('metrics.sandbox_attempts', 0)
            ->assertJsonPath('speech_processing.conditional_mu_noise_reduction_enabled', false)
            ->assertJsonPath('speech_processing.default_mode', 'raw_first')
            ->assertJsonPath('system_health.0.status', 'online')
            ->assertJsonPath('recent_actions.0.description', 'Development account prepared.')
            ->assertJsonStructure([
                'metrics',
                'part_one_distribution',
                'reading_profile_distribution',
                'system_health',
                'speech_processing',
                'recent_assessment_activity',
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
