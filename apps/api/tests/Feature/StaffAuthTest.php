<?php

namespace Tests\Feature;

use App\Models\StaffUser;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class StaffAuthTest extends TestCase
{
    public function test_system_administrator_can_sign_in_with_hashed_credentials(): void
    {
        $staffUser = StaffUser::query()->create([
            'username' => 'system-admin-test',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);

        $this->assertNotSame('local-test-password', $staffUser->password);
        $this->assertTrue(Hash::check('local-test-password', $staffUser->password));

        $response = $this->postJson('/api/staff/login', [
            'identifier' => 'SYSTEM-ADMIN-TEST',
            'password' => 'local-test-password',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('staff.username', 'system-admin-test')
            ->assertJsonPath('staff.role', 'system_admin');

        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $staffUser->id,
            'action_key' => 'staff.login',
        ]);
    }

    public function test_invalid_staff_credentials_are_rejected(): void
    {
        StaffUser::query()->create([
            'username' => 'system-admin-test',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);

        $this->postJson('/api/staff/login', [
            'identifier' => 'system-admin-test',
            'password' => 'incorrect-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('identifier');
    }
}
