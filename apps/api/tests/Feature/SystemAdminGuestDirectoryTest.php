<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GuestAccount;
use App\Models\GuestSession;
use App\Models\StaffUser;
use Illuminate\Support\Str;
use Tests\TestCase;

final class SystemAdminGuestDirectoryTest extends TestCase
{
    public function test_system_administrator_can_review_guest_identity_and_access_truth(): void
    {
        $this->authenticateStaff($this->systemAdministrator());

        $verified = GuestAccount::query()->create([
            'email' => 'verified@example.test',
            'password' => 'local-password',
            'display_name' => 'Verified Reader',
            'email_verified_at' => now()->subDay(),
            'is_active' => true,
            'last_signed_in_at' => now()->subHour(),
        ]);
        GuestSession::query()->create([
            'guest_account_id' => $verified->id,
            'token_hash' => hash('sha256', Str::random(64)),
            'last_used_at' => now()->subMinutes(5),
            'expires_at' => now()->addHour(),
        ]);

        GuestAccount::query()->create([
            'email' => 'pending@example.test',
            'password' => 'local-password',
            'display_name' => null,
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/staff/system-admin/guests');

        $response
            ->assertOk()
            ->assertJsonPath('summary.total_guests', 2)
            ->assertJsonPath('summary.active_guests', 1)
            ->assertJsonPath('summary.verified_guests', 1)
            ->assertJsonPath('summary.pending_verification', 1)
            ->assertJsonPath('summary.active_sessions', 1)
            ->assertJsonPath('guests.0.email', 'pending@example.test')
            ->assertJsonPath('guests.0.email_verified_at', null)
            ->assertJsonPath('guests.1.email', 'verified@example.test')
            ->assertJsonPath('guests.1.active_session_count', 1)
            ->assertJsonMissingPath('guests.0.password')
            ->assertJsonMissingPath('guests.0.token_hash');
    }

    public function test_deactivating_a_guest_revokes_active_sessions_and_is_audited(): void
    {
        $systemAdministrator = $this->systemAdministrator();
        $this->authenticateStaff($systemAdministrator);

        $guest = GuestAccount::query()->create([
            'email' => 'reader@example.test',
            'password' => 'local-password',
            'display_name' => 'Guest Reader',
            'email_verified_at' => now(),
            'is_active' => true,
        ]);
        $activeSession = GuestSession::query()->create([
            'guest_account_id' => $guest->id,
            'token_hash' => hash('sha256', Str::random(64)),
            'expires_at' => now()->addHour(),
        ]);
        $expiredSession = GuestSession::query()->create([
            'guest_account_id' => $guest->id,
            'token_hash' => hash('sha256', Str::random(64)),
            'expires_at' => now()->subHour(),
        ]);

        $this->patchJson("/api/staff/system-admin/guests/{$guest->id}/access", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('guest.is_active', false)
            ->assertJsonPath('guest.active_session_count', 0)
            ->assertJsonPath('revoked_sessions', 1);

        $this->assertNotNull($activeSession->fresh()->revoked_at);
        $this->assertNull($expiredSession->fresh()->revoked_at);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'guest_access.deactivated',
        ]);
    }

    public function test_reactivation_preserves_verification_and_does_not_create_a_session(): void
    {
        $systemAdministrator = $this->systemAdministrator();
        $this->authenticateStaff($systemAdministrator);
        $verifiedAt = now()->subWeek()->startOfSecond();

        $guest = GuestAccount::query()->create([
            'email' => 'returning@example.test',
            'password' => 'local-password',
            'email_verified_at' => $verifiedAt,
            'is_active' => false,
        ]);

        $this->patchJson("/api/staff/system-admin/guests/{$guest->id}/access", [
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('guest.is_active', true)
            ->assertJsonPath('revoked_sessions', 0);

        $guest->refresh();
        $this->assertTrue($guest->is_active);
        $this->assertTrue($verifiedAt->equalTo($guest->email_verified_at));
        $this->assertDatabaseCount('guest_sessions', 0);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'guest_access.reactivated',
        ]);
    }

    public function test_guest_access_management_is_restricted_to_system_administrators(): void
    {
        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-test',
            'password' => 'local-password',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($schoolAdministrator);

        $guest = GuestAccount::query()->create([
            'email' => 'restricted@example.test',
            'password' => 'local-password',
            'is_active' => true,
        ]);

        $this->getJson('/api/staff/system-admin/guests')->assertForbidden();
        $this->patchJson("/api/staff/system-admin/guests/{$guest->id}/access", [
            'is_active' => false,
        ])->assertForbidden();

        $this->assertTrue($guest->fresh()->is_active);
        $this->assertDatabaseCount('staff_audit_logs', 0);
    }

    private function systemAdministrator(): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'system-admin-test',
            'password' => 'local-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
    }
}
