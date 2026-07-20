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
            ->assertJsonPath('system_health.0.status', 'online')
            ->assertJsonPath('recent_actions.0.description', 'Development account prepared.')
            ->assertJsonStructure([
                'metrics',
                'part_one_distribution',
                'reading_profile_distribution',
                'system_health',
                'recent_assessment_activity',
                'recent_actions',
                'generated_at',
            ]);
    }
}
