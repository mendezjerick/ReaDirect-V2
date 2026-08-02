<?php

namespace Tests\Feature;

use App\Models\StaffSession;
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
            ->assertJsonPath('staff.role', 'system_admin')
            ->assertJsonPath('session.remembered', false)
            ->assertJsonPath('session.heartbeat_interval_seconds', 30);

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

    public function test_only_one_system_administrator_session_can_be_active_system_wide(): void
    {
        $first = $this->staffUser('first-system-admin', 'system_admin');
        $second = $this->staffUser('second-system-admin', 'system_admin');

        $this->login($first)->assertOk();
        $this->login($second)
            ->assertConflict()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('code', 'system_admin_session_active');

        $this->assertSame(1, StaffSession::query()
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->count());
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $second->id,
            'action_key' => 'staff.login_blocked_exclusive_session',
        ]);
    }

    public function test_expired_and_revoked_sysadmin_sessions_do_not_block_login(): void
    {
        $first = $this->staffUser('former-system-admin', 'system_admin');
        $second = $this->staffUser('next-system-admin', 'system_admin');
        StaffSession::query()->create([
            'staff_user_id' => $first->id,
            'token_hash' => hash('sha256', 'expired-system-admin-session'),
            'last_used_at' => now()->subHours(2),
            'expires_at' => now()->subHour(),
        ]);
        StaffSession::query()->create([
            'staff_user_id' => $first->id,
            'token_hash' => hash('sha256', 'revoked-system-admin-session'),
            'last_used_at' => now(),
            'expires_at' => now()->addHour(),
            'revoked_at' => now(),
        ]);

        $this->login($second)->assertOk();

        $this->assertSame(1, StaffSession::query()->count());
        $this->assertSame($second->id, StaffSession::query()->value('staff_user_id'));
    }

    public function test_stale_non_remembered_sysadmin_session_does_not_block_login(): void
    {
        config()->set('staff.non_remembered_session_lease_seconds', 120);
        $first = $this->staffUser('closed-browser-system-admin', 'system_admin');
        $second = $this->staffUser('returning-system-admin', 'system_admin');
        StaffSession::query()->create([
            'staff_user_id' => $first->id,
            'token_hash' => hash('sha256', 'closed-browser-session'),
            'remembered' => false,
            'last_used_at' => now()->subSeconds(121),
            'expires_at' => now()->addHours(7),
        ]);

        $this->login($second)->assertOk();

        $this->assertSame(1, StaffSession::query()->count());
        $this->assertSame($second->id, StaffSession::query()->value('staff_user_id'));
    }

    public function test_logout_releases_the_exclusive_sysadmin_slot(): void
    {
        $first = $this->staffUser('logout-system-admin', 'system_admin');
        $second = $this->staffUser('replacement-system-admin', 'system_admin');
        $token = $this->login($first)->assertOk()->json('token');

        $this->withToken($token)->postJson('/api/staff/logout')->assertOk();
        $this->withHeader('Authorization', '')->login($second)->assertOk();
    }

    public function test_non_sysadmin_staff_keep_multiple_session_support(): void
    {
        $teacher = $this->staffUser('multi-session-teacher', 'teacher');

        $this->login($teacher)->assertOk();
        $this->login($teacher)->assertOk();

        $this->assertSame(2, StaffSession::query()
            ->where('staff_user_id', $teacher->id)
            ->whereNull('revoked_at')
            ->count());
    }

    public function test_session_guard_reconciles_preexisting_duplicate_sysadmin_sessions(): void
    {
        $admin = $this->staffUser('duplicate-session-admin', 'system_admin');
        $olderToken = str_repeat('o', 64);
        $newerToken = str_repeat('n', 64);
        $older = StaffSession::query()->create([
            'staff_user_id' => $admin->id,
            'token_hash' => hash('sha256', $olderToken),
            'last_used_at' => now(),
            'expires_at' => now()->addHour(),
        ]);
        $newer = StaffSession::query()->create([
            'staff_user_id' => $admin->id,
            'token_hash' => hash('sha256', $newerToken),
            'last_used_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        $this->withToken($olderToken)->getJson('/api/staff/session')->assertUnauthorized();
        $this->assertNotNull($older->fresh()->revoked_at);
        $this->withToken($newerToken)->getJson('/api/staff/session')->assertOk();
        $this->assertNull($newer->fresh()->revoked_at);
    }

    public function test_remembered_session_is_bound_to_the_browser_device(): void
    {
        config()->set('staff.remembered_session_lifetime_days', 30);
        $teacher = $this->staffUser('remembered-teacher', 'teacher');
        $deviceId = '4df38922-9a72-49c8-aea8-a769793315bf';

        $login = $this->postJson('/api/staff/login', [
            'identifier' => $teacher->username,
            'password' => 'local-test-password',
            'remember_me' => true,
            'device_id' => $deviceId,
        ])->assertOk()->assertJsonPath('session.remembered', true);

        $session = StaffSession::query()->latest('id')->firstOrFail();
        $this->assertTrue($session->remembered);
        $this->assertNotSame($deviceId, $session->device_hash);
        $this->assertTrue($session->expires_at->gt(now()->addDays(29)));

        $this->withToken($login->json('token'))
            ->withHeader('X-ReaDirect-Device', $deviceId)
            ->getJson('/api/staff/session')
            ->assertOk();
    }

    public function test_non_remembered_staff_session_heartbeat_renews_the_browser_lease(): void
    {
        config()->set('staff.non_remembered_session_lease_seconds', 120);
        config()->set('staff.session_heartbeat_interval_seconds', 30);
        $teacher = $this->staffUser('heartbeat-teacher', 'teacher');
        $login = $this->login($teacher)
            ->assertOk()
            ->assertJsonPath('session.heartbeat_interval_seconds', 30);
        $token = $login->json('token');
        $session = StaffSession::query()->latest('id')->firstOrFail();
        $initialLastUsedAt = $session->last_used_at;

        $this->travel(90)->seconds();
        $this->withToken($token)
            ->postJson('/api/staff/session/heartbeat')
            ->assertOk()
            ->assertJsonPath('active', true);

        $this->assertTrue($session->fresh()->last_used_at->gt($initialLastUsedAt));
        $this->travel(90)->seconds();
        $this->withToken($token)->getJson('/api/staff/session')->assertOk();
    }

    public function test_stale_non_remembered_staff_session_is_revoked(): void
    {
        config()->set('staff.non_remembered_session_lease_seconds', 120);
        $teacher = $this->staffUser('closed-browser-teacher', 'teacher');
        $token = str_repeat('s', 64);
        $session = StaffSession::query()->create([
            'staff_user_id' => $teacher->id,
            'token_hash' => hash('sha256', $token),
            'remembered' => false,
            'last_used_at' => now()->subSeconds(121),
            'expires_at' => now()->addHours(7),
        ]);

        $this->withToken($token)->getJson('/api/staff/session')->assertUnauthorized();

        $this->assertNotNull($session->fresh()->revoked_at);
    }

    public function test_remembered_session_is_not_subject_to_the_browser_heartbeat_lease(): void
    {
        config()->set('staff.non_remembered_session_lease_seconds', 120);
        $teacher = $this->staffUser('persistent-teacher', 'teacher');
        $deviceId = '34af2dd2-99da-46fd-a419-3f0d6b3d0a7f';
        $login = $this->postJson('/api/staff/login', [
            'identifier' => $teacher->username,
            'password' => 'local-test-password',
            'remember_me' => true,
            'device_id' => $deviceId,
        ])->assertOk()->assertJsonPath('session.heartbeat_interval_seconds', null);

        $this->travel(10)->minutes();
        $this->withToken($login->json('token'))
            ->withHeader('X-ReaDirect-Device', $deviceId)
            ->getJson('/api/staff/session')
            ->assertOk();
    }

    public function test_remembered_session_is_revoked_when_device_binding_is_missing(): void
    {
        $teacher = $this->staffUser('device-bound-teacher', 'teacher');
        $token = $this->postJson('/api/staff/login', [
            'identifier' => $teacher->username,
            'password' => 'local-test-password',
            'remember_me' => true,
            'device_id' => 'e5a6bb80-d312-4c23-a145-a386acb53d09',
        ])->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/staff/session')->assertUnauthorized();
        $this->assertNotNull(StaffSession::query()->latest('id')->firstOrFail()->revoked_at);
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

    private function staffUser(string $username, string $role): StaffUser
    {
        return StaffUser::query()->create([
            'username' => $username,
            'password' => 'local-test-password',
            'role' => $role,
            'display_name' => $username,
            'is_active' => true,
        ]);
    }

    private function login(StaffUser $staffUser)
    {
        return $this->postJson('/api/staff/login', [
            'identifier' => $staffUser->username,
            'password' => 'local-test-password',
        ]);
    }
}
