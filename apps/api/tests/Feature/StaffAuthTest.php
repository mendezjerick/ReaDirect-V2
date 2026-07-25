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
            ->assertJsonStructure(['token', 'session' => ['expires_at']])
            ->assertJsonPath('staff.username', 'system-admin-test')
            ->assertJsonPath('staff.role', 'system_admin');

        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $staffUser->id,
            'action_key' => 'staff.login',
        ]);

        $token = $response->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/staff/session')
            ->assertOk()
            ->assertJsonPath('staff.id', $staffUser->id);

        $this->postJson('/api/staff/logout')
            ->assertOk()
            ->assertJsonPath('signed_out', true);

        $this->getJson('/api/staff/session')->assertUnauthorized();
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

    public function test_staff_routes_require_an_active_server_session(): void
    {
        $this->getJson('/api/staff/system-admin/overview')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Staff session is required.');
    }

    public function test_staff_role_cannot_open_another_role_workspace(): void
    {
        $teacher = StaffUser::query()->create([
            'username' => 'teacher-test',
            'password' => 'local-test-password',
            'role' => 'teacher',
            'display_name' => 'Teacher',
            'is_active' => true,
        ]);
        $this->authenticateStaff($teacher);

        $this->getJson('/api/staff/system-admin/overview')
            ->assertForbidden()
            ->assertJsonPath('message', 'This staff account cannot access that workspace.');
    }

    public function test_staff_route_identity_cannot_be_replaced_with_another_account(): void
    {
        $firstTeacher = StaffUser::query()->create([
            'username' => 'first-teacher',
            'password' => 'local-test-password',
            'role' => 'teacher',
            'display_name' => 'First Teacher',
            'is_active' => true,
        ]);
        $secondTeacher = StaffUser::query()->create([
            'username' => 'second-teacher',
            'password' => 'local-test-password',
            'role' => 'teacher',
            'display_name' => 'Second Teacher',
            'is_active' => true,
        ]);
        $this->authenticateStaff($firstTeacher);

        $this->getJson("/api/staff/teacher/{$secondTeacher->id}/overview")
            ->assertForbidden()
            ->assertJsonPath('message', 'A staff account cannot act as another staff user.');
    }
}
