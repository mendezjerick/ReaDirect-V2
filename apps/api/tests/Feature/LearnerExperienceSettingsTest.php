<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Models\SystemSetting;
use Illuminate\Support\Str;
use Tests\TestCase;

final class LearnerExperienceSettingsTest extends TestCase
{
    public function test_standard_learner_receives_only_default_effective_modes(): void
    {
        [, $token] = $this->learnerSession('standard');

        $this->withToken($token)
            ->getJson('/api/learners/experience/settings')
            ->assertOk()
            ->assertExactJson([
                'revision' => 'default-v1',
                'display_mode' => 'live2d',
                'speech_mode' => 'hybrid',
            ])
            ->assertJsonMissingPath('enabled')
            ->assertJsonMissingPath('static_clara')
            ->assertJsonMissingPath('published_speech_only');
    }

    public function test_portal_learner_receives_the_same_effective_contract_without_private_setting_values(): void
    {
        SystemSetting::query()->create([
            'key' => 'learner.lightweight_mode',
            'value' => [
                'enabled' => true,
                'static_clara' => false,
                'published_speech_only' => true,
            ],
        ]);
        [, $token] = $this->learnerSession('portal');

        $response = $this->withToken($token)
            ->getJson('/api/learners/experience/settings')
            ->assertOk()
            ->assertJsonPath('display_mode', 'live2d')
            ->assertJsonPath('speech_mode', 'published_only')
            ->assertJsonMissingPath('enabled')
            ->assertJsonMissingPath('static_clara')
            ->assertJsonMissingPath('published_speech_only')
            ->assertJsonMissingPath('applies_on_next_learner_load');

        $this->assertStringStartsWith(
            'setting-',
            (string) $response->json('revision'),
        );
    }

    public function test_all_effective_renderer_and_speech_mode_combinations_are_learner_safe(): void
    {
        [, $token] = $this->learnerSession('standard');

        foreach ([
            [true, true, true, 'static', 'published_only'],
            [true, true, false, 'static', 'hybrid'],
            [true, false, true, 'live2d', 'published_only'],
            [false, true, true, 'live2d', 'hybrid'],
        ] as [$enabled, $staticClara, $publishedSpeechOnly, $displayMode, $speechMode]) {
            SystemSetting::query()->updateOrCreate(
                ['key' => 'learner.lightweight_mode'],
                ['value' => [
                    'enabled' => $enabled,
                    'static_clara' => $staticClara,
                    'published_speech_only' => $publishedSpeechOnly,
                ]],
            );

            $this->withToken($token)
                ->getJson('/api/learners/experience/settings')
                ->assertOk()
                ->assertJsonPath('display_mode', $displayMode)
                ->assertJsonPath('speech_mode', $speechMode)
                ->assertJsonMissingPath('enabled')
                ->assertJsonMissingPath('static_clara')
                ->assertJsonMissingPath('published_speech_only');
        }
    }

    public function test_learner_experience_settings_requires_a_valid_learner_session(): void
    {
        $this->getJson('/api/learners/experience/settings')->assertUnauthorized();
    }

    public function test_public_intro_renderer_contract_uses_the_effective_mode_without_exposing_setting_controls(): void
    {
        SystemSetting::query()->create([
            'key' => 'learner.lightweight_mode',
            'value' => [
                'enabled' => true,
                'static_clara' => true,
                'published_speech_only' => true,
            ],
        ]);

        $this->getJson('/api/experience/intro/settings')
            ->assertOk()
            ->assertJsonPath('display_mode', 'static')
            ->assertJsonPath('speech_mode', 'published_only')
            ->assertJsonMissingPath('enabled')
            ->assertJsonMissingPath('static_clara')
            ->assertJsonMissingPath('published_speech_only');
    }

    /**
     * @return array{Learner, string}
     */
    private function learnerSession(string $sessionType): array
    {
        $learner = Learner::query()->create([
            'learner_code' => $sessionType === 'portal' ? 'LW002' : 'LW001',
            'account_purpose' => $sessionType === 'portal' ? 'portal_system' : 'standard',
            'password' => 'local-password',
            'first_name' => 'Lightweight',
            'middle_name' => 'Mode',
            'last_name' => 'Learner',
            'is_active' => true,
        ]);
        $token = Str::random(64);

        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => $sessionType,
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [$learner, $token];
    }
}
