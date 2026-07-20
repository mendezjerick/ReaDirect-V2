<?php

namespace Tests\Feature;

use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminWorkspaceTest extends TestCase
{
    public function test_school_administrator_login_reports_required_school_setup(): void
    {
        StaffUser::query()->create([
            'username' => 'school-admin-test',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->postJson('/api/staff/login', [
            'identifier' => 'school-admin-test',
            'password' => 'temporary-pass',
        ])
            ->assertOk()
            ->assertJsonPath('staff.role', 'school_admin')
            ->assertJsonPath('staff.school', null)
            ->assertJsonPath('staff.requires_school_setup', true);
    }

    public function test_school_administrator_completes_school_before_opening_dashboard(): void
    {
        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-test',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->getJson("/api/staff/school-admin/{$schoolAdministrator->id}/overview")
            ->assertStatus(409);

        $this->postJson("/api/staff/school-admin/{$schoolAdministrator->id}/school", [
            'school_name' => '  Northfield   Elementary School  ',
        ])
            ->assertOk()
            ->assertJsonPath('staff.school.name', 'Northfield Elementary School')
            ->assertJsonPath('staff.requires_school_setup', false);

        $this->assertDatabaseHas('schools', [
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $schoolAdministrator->id,
            'action_key' => 'school_administrator.school_completed',
        ]);

        $this->getJson("/api/staff/school-admin/{$schoolAdministrator->id}/overview")
            ->assertOk()
            ->assertJsonPath('school.name', 'Northfield Elementary School')
            ->assertJsonPath('metrics.total_teachers', 0)
            ->assertJsonPath('metrics.total_learners', 0)
            ->assertJsonPath('metrics.active_learners', 0);
    }
}
