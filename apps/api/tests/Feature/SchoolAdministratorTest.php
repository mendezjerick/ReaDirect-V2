<?php

namespace Tests\Feature;

use App\Models\StaffUser;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class SchoolAdministratorTest extends TestCase
{
    public function test_system_administrator_can_create_a_school_administrator(): void
    {
        $systemAdministrator = StaffUser::query()->create([
            'username' => 'system-admin-test',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/staff/system-admin/school-administrators', [
            'username' => '  New.School.Admin  ',
            'temporary_password' => 'temporary-pass',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('school_administrator.username', 'new.school.admin')
            ->assertJsonPath('school_administrator.requires_school_setup', true)
            ->assertJsonPath('school_administrator.requires_credential_setup', true);

        $createdAccount = StaffUser::query()->where('username', 'new.school.admin')->firstOrFail();

        $this->assertSame('school_admin', $createdAccount->role);
        $this->assertNull($createdAccount->school_id);
        $this->assertTrue(Hash::check('temporary-pass', $createdAccount->password));
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'school_administrator.created',
        ]);
    }

    public function test_school_administrator_username_is_unique_without_case_sensitivity(): void
    {
        StaffUser::query()->create([
            'username' => 'existing-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->postJson('/api/staff/system-admin/school-administrators', [
            'username' => 'EXISTING-ADMIN',
            'temporary_password' => 'another-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('username');
    }

    public function test_school_administrator_list_excludes_other_staff_roles(): void
    {
        StaffUser::query()->create([
            'username' => 'school-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        StaffUser::query()->create([
            'username' => 'teacher-account',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'display_name' => 'Teacher',
            'is_active' => true,
        ]);

        $this->getJson('/api/staff/system-admin/school-administrators')
            ->assertOk()
            ->assertJsonCount(1, 'school_administrators')
            ->assertJsonPath('school_administrators.0.username', 'school-admin');
    }
}
