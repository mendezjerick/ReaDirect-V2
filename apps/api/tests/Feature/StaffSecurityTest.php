<?php

namespace Tests\Feature;

use App\Mail\StaffVerificationCodeMail;
use App\Models\StaffSession;
use App\Models\StaffUser;
use App\Models\StaffVerificationCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class StaffSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_staff_can_request_and_confirm_a_verified_email_binding(): void
    {
        $staffUser = $this->staffUser('email-binding-teacher');
        $token = $this->login($staffUser);

        $this->withToken($token)->postJson('/api/staff/security/email-verification', [
            'email' => '  Teacher.One@Example.com ',
            'current_password' => 'temporary-password',
        ])->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('verification_sent', true)
            ->assertJsonPath('expires_in_seconds', 600);

        $mail = $this->lastMail();
        $this->assertTrue($mail->hasTo('teacher.one@example.com'));
        $record = StaffVerificationCode::query()->firstOrFail();
        $this->assertSame(StaffVerificationCode::PURPOSE_EMAIL_BINDING, $record->purpose);
        $this->assertSame('teacher.one@example.com', $record->destination_email);
        $this->assertNotSame($mail->verificationCode, $record->code_hash);
        $this->assertNull($staffUser->fresh()->email);

        $this->withToken($token)->postJson('/api/staff/security/email-verification/confirm', [
            'code' => $mail->verificationCode,
        ])->assertOk()
            ->assertJsonPath('email', 'teacher.one@example.com');

        $staffUser->refresh();
        $this->assertNotNull($staffUser->email_verified_at);
        $this->assertNotNull($record->fresh()->consumed_at);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $staffUser->id,
            'action_key' => 'staff.email_verified',
        ]);
    }

    public function test_email_binding_requires_the_current_password(): void
    {
        $staffUser = $this->staffUser('reauth-teacher');

        $this->withToken($this->login($staffUser))
            ->postJson('/api/staff/security/email-verification', [
                'email' => 'teacher@example.com',
                'current_password' => 'wrong-password',
            ])->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        Mail::assertNothingSent();
        $this->assertDatabaseCount('staff_verification_codes', 0);
    }

    public function test_email_binding_rejects_case_insensitive_duplicates(): void
    {
        $staffUser = $this->staffUser('new-email-owner');
        $this->staffUser('existing-email-owner', 'Existing@Example.com', now());

        $this->withToken($this->login($staffUser))
            ->postJson('/api/staff/security/email-verification', [
                'email' => 'existing@example.com',
                'current_password' => 'temporary-password',
            ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        Mail::assertNothingSent();
    }

    public function test_verification_codes_are_single_use_and_lock_after_bounded_attempts(): void
    {
        config()->set('security.staff_auth.verification_code_max_attempts', 3);
        $staffUser = $this->staffUser('bounded-code-teacher');
        $token = $this->login($staffUser);
        $this->requestEmailCode($token, 'bounded@example.com');
        $correctCode = $this->lastMail()->verificationCode;

        foreach (range(1, 3) as $attempt) {
            $this->withToken($token)
                ->postJson('/api/staff/security/email-verification/confirm', ['code' => '000000'])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('code');
        }

        $record = StaffVerificationCode::query()->firstOrFail();
        $this->assertSame(3, $record->fresh()->attempt_count);
        $this->assertNotNull($record->fresh()->consumed_at);
        $this->withToken($token)
            ->postJson('/api/staff/security/email-verification/confirm', ['code' => $correctCode])
            ->assertUnprocessable();
        $this->assertNull($staffUser->fresh()->email_verified_at);
    }

    public function test_expired_code_cannot_bind_an_email(): void
    {
        $staffUser = $this->staffUser('expired-code-teacher');
        $token = $this->login($staffUser);
        $this->requestEmailCode($token, 'expired@example.com');
        $mail = $this->lastMail();
        StaffVerificationCode::query()->update(['expires_at' => now()->subSecond()]);

        $this->withToken($token)
            ->postJson('/api/staff/security/email-verification/confirm', [
                'code' => $mail->verificationCode,
            ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->assertNotNull(StaffVerificationCode::query()->firstOrFail()->consumed_at);
        $this->assertNull($staffUser->fresh()->email);
    }

    public function test_code_resends_have_a_database_backed_cooldown(): void
    {
        $staffUser = $this->staffUser('resend-teacher');
        $token = $this->login($staffUser);
        $this->requestEmailCode($token, 'resend@example.com');

        $this->withToken($token)->postJson('/api/staff/security/email-verification', [
            'email' => 'resend@example.com',
            'current_password' => 'temporary-password',
        ])->assertTooManyRequests()
            ->assertHeader('Retry-After');

        Mail::assertSentCount(1);
        $this->assertDatabaseCount('staff_verification_codes', 1);
    }

    public function test_password_change_code_requires_an_already_verified_email(): void
    {
        $staffUser = $this->staffUser('unverified-password-teacher');
        $token = $this->login($staffUser);
        $this->requestEmailCode($token, 'pending@example.com');

        $this->withToken($token)->postJson('/api/staff/security/password-change-code', [
            'current_password' => 'temporary-password',
        ])->assertConflict()
            ->assertJsonPath(
                'message',
                'A verified email address is required before changing the password.',
            );

        Mail::assertSentCount(1);
    }

    public function test_verified_email_code_authorizes_password_change_and_revokes_other_sessions(): void
    {
        $staffUser = $this->staffUser(
            'password-change-teacher',
            'verified@example.com',
            now(),
        );
        $currentToken = $this->login($staffUser);
        $otherToken = $this->login($staffUser);

        $this->withToken($currentToken)->postJson('/api/staff/security/password-change-code', [
            'current_password' => 'temporary-password',
        ])->assertOk();
        $mail = $this->lastMail();
        $this->assertSame(StaffVerificationCode::PURPOSE_PASSWORD_CHANGE, $mail->purpose);

        $this->withToken($currentToken)->putJson('/api/staff/security/password', [
            'current_password' => 'temporary-password',
            'code' => $mail->verificationCode,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('password_changed', true);

        $staffUser->refresh();
        $this->assertTrue(Hash::check('new-secure-password', $staffUser->password));
        $this->assertFalse($staffUser->requires_credential_setup);
        $this->assertSame(1, StaffSession::query()
            ->where('staff_user_id', $staffUser->id)
            ->whereNull('revoked_at')
            ->count());
        $this->withToken($otherToken)->getJson('/api/staff/session')->assertUnauthorized();
        $this->withToken($currentToken)->getJson('/api/staff/session')->assertOk();

        $this->withToken($currentToken)->putJson('/api/staff/security/password', [
            'current_password' => 'new-secure-password',
            'code' => $mail->verificationCode,
            'password' => 'another-secure-password',
            'password_confirmation' => 'another-secure-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_password_change_rejects_the_wrong_current_password_without_consuming_code(): void
    {
        $staffUser = $this->staffUser('wrong-current-teacher', 'bound@example.com', now());
        $token = $this->login($staffUser);
        $this->withToken($token)->postJson('/api/staff/security/password-change-code', [
            'current_password' => 'temporary-password',
        ])->assertOk();

        $this->withToken($token)->putJson('/api/staff/security/password', [
            'current_password' => 'wrong-password',
            'code' => $this->lastMail()->verificationCode,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->assertNull(StaffVerificationCode::query()->firstOrFail()->consumed_at);
    }

    private function staffUser(
        string $username,
        ?string $email = null,
        mixed $emailVerifiedAt = null,
    ): StaffUser {
        return StaffUser::query()->create([
            'username' => $username,
            'email' => $email,
            'email_verified_at' => $emailVerifiedAt,
            'password' => 'temporary-password',
            'role' => 'teacher',
            'display_name' => 'Security Test Teacher',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);
    }

    private function login(StaffUser $staffUser): string
    {
        return $this->postJson('/api/staff/login', [
            'identifier' => $staffUser->username,
            'password' => 'temporary-password',
        ])->assertOk()->json('token');
    }

    private function requestEmailCode(string $token, string $email): void
    {
        $this->withToken($token)->postJson('/api/staff/security/email-verification', [
            'email' => $email,
            'current_password' => 'temporary-password',
        ])->assertOk();
    }

    private function lastMail(): StaffVerificationCodeMail
    {
        return Mail::sent(StaffVerificationCodeMail::class)->last();
    }
}
