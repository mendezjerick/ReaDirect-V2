<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Services\LearnerSessionResolver;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class LearnerAuthSecurityTest extends TestCase
{
    public function test_login_uses_one_generic_error_for_unusable_credentials(): void
    {
        $active = $this->learner('LA001', 'correct-password');
        $this->learner('LI001', 'correct-password', false);
        DB::table('learners')->where('id', $active->id)->update(['password' => 'corrupt-hash']);

        $responses = [
            $this->postJson('/api/learners/login', [
                'learner_code' => 'LX001',
                'password' => 'wrong-password',
            ]),
            $this->postJson('/api/learners/login', [
                'learner_code' => 'LI001',
                'password' => 'correct-password',
            ]),
            $this->postJson('/api/learners/login', [
                'learner_code' => 'LA001',
                'password' => 'correct-password',
            ]),
        ];

        foreach ($responses as $response) {
            $response
                ->assertUnprocessable()
                ->assertJsonPath(
                    'errors.learner_code.0',
                    'The provided Learner credentials are incorrect.',
                );
        }
        $this->assertDatabaseCount('learner_sessions', 0);
    }

    public function test_login_is_limited_per_normalized_learner_code(): void
    {
        config()->set('security.learner_auth.login_ip_attempts_per_minute', 100);
        config()->set('security.learner_auth.login_identifier_attempts_per_minute', 2);
        $this->learner('LR001', 'correct-password');

        foreach (['lr001', 'LR001'] as $learnerCode) {
            $this->postJson('/api/learners/login', [
                'learner_code' => $learnerCode,
                'password' => 'wrong-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/learners/login', [
            'learner_code' => 'Lr001',
            'password' => 'wrong-password',
        ])
            ->assertTooManyRequests()
            ->assertHeader('Retry-After');
    }

    public function test_login_is_also_limited_per_client_ip(): void
    {
        config()->set('security.learner_auth.login_ip_attempts_per_minute', 2);
        config()->set('security.learner_auth.login_identifier_attempts_per_minute', 100);

        foreach (['LX010', 'LX011'] as $learnerCode) {
            $this->postJson('/api/learners/login', [
                'learner_code' => $learnerCode,
                'password' => 'wrong-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/learners/login', [
            'learner_code' => 'LX012',
            'password' => 'wrong-password',
        ])->assertTooManyRequests();
    }

    public function test_login_issues_non_cacheable_bounded_sessions(): void
    {
        config()->set('security.learner_auth.max_active_sessions', 2);
        config()->set('security.learner_auth.session_lifetime_hours', 6);
        $learner = $this->learner('LS001', 'correct-password');
        $oldest = $this->sessionRecord($learner, str_repeat('a', 64));
        $newer = $this->sessionRecord($learner, str_repeat('b', 64));

        $loginStartedAt = now();
        $response = $this->postJson('/api/learners/login', [
            'learner_code' => 'ls001',
            'password' => 'correct-password',
        ])
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('Pragma', 'no-cache')
            ->assertJsonStructure(['token', 'session' => ['expires_at']]);

        $this->assertSame(64, strlen($response->json('token')));
        $this->assertNotNull($oldest->fresh()->revoked_at);
        $this->assertNull($newer->fresh()->revoked_at);
        $issued = LearnerSession::query()->latest('id')->firstOrFail();
        $this->assertTrue($issued->expires_at->between(
            $loginStartedAt->copy()->addHours(6)->subSecond(),
            now()->addHours(6)->addSecond(),
        ));
    }

    public function test_idle_session_is_revoked_with_a_generic_bearer_challenge(): void
    {
        config()->set('security.learner_auth.session_idle_timeout_minutes', 30);
        $learner = $this->learner('LE001', 'correct-password');
        $token = str_repeat('c', 64);
        $session = $this->sessionRecord($learner, $token, now()->subMinutes(31));

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertUnauthorized()
            ->assertHeader('WWW-Authenticate', 'Bearer')
            ->assertJsonPath('message', 'Learner authentication is required.');

        $this->assertNotNull($session->fresh()->revoked_at);
    }

    public function test_active_session_is_touched_once_and_responses_are_not_cacheable(): void
    {
        config()->set('security.learner_auth.session_touch_interval_seconds', 60);
        $learner = $this->learner('LT001', 'correct-password');
        $token = str_repeat('d', 64);
        $lastSeen = now()->subMinutes(2);
        $session = $this->sessionRecord($learner, $token, $lastSeen);

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private');

        $this->assertTrue($session->fresh()->last_seen_at->gt($lastSeen));
    }

    public function test_active_session_heartbeat_refreshes_the_idle_lease(): void
    {
        $learner = $this->learner('LH001', 'correct-password');
        $token = str_repeat('h', 64);
        $lastSeen = now()->subMinutes(20);
        $session = $this->sessionRecord($learner, $token, $lastSeen);

        $this->withToken($token)
            ->postJson('/api/learners/session/heartbeat')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('active', true);

        $this->assertTrue($session->fresh()->last_seen_at->gt($lastSeen));
    }

    public function test_browser_sentinel_uses_the_httponly_cookie_session(): void
    {
        $learner = $this->learner('LC001', 'correct-password');
        $token = str_repeat('e', 64);
        $this->sessionRecord($learner, $token);

        $this->withToken(LearnerSessionResolver::BROWSER_SESSION_SENTINEL)
            ->withUnencryptedCookie(LearnerSessionResolver::COOKIE_NAME, $token)
            ->withCredentials()
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('learner.id', $learner->id);
    }

    public function test_malformed_bearer_tokens_are_rejected_consistently(): void
    {
        $this->withToken(str_repeat('x', 129))
            ->getJson('/api/learners/session')
            ->assertUnauthorized()
            ->assertHeader('WWW-Authenticate', 'Bearer')
            ->assertJsonPath('message', 'Learner authentication is required.');
    }

    private function learner(string $code, string $password, bool $active = true): Learner
    {
        return Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => $password,
            'first_name' => 'Security',
            'middle_name' => 'Test',
            'last_name' => 'Learner',
            'suffix' => null,
            'lrn' => null,
            'school_id' => null,
            'teacher_id' => null,
            'grade_level' => null,
            'section' => null,
            'is_active' => $active,
        ]);
    }

    private function sessionRecord(
        Learner $learner,
        string $token,
        mixed $lastSeenAt = null,
    ): LearnerSession {
        return LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => $lastSeenAt ?? now(),
            'expires_at' => now()->addHours(12),
        ]);
    }
}
