<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureAsrAvailable;
use App\Services\FilipinoTtsCatalogSource;
use App\Services\LearnerLightweightModeSettings;
use App\Services\LearnerSpeechPolicy;
use App\Services\PublishedTtsCatalogDefinitions;
use App\Support\DeploymentSecurity;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

final class PilotDeploymentModeTest extends TestCase
{
    public function test_asr_middleware_returns_an_explicit_pilot_response(): void
    {
        config()->set('pilot.asr_available', false);
        config()->set(
            'pilot.asr_unavailable_message',
            'ASR is unavailable during pilot testing.',
        );

        $response = app(EnsureAsrAvailable::class)->handle(
            Request::create('/api/learners/lessons/lesson-1/1/submit', 'POST'),
            static fn (): Response => response()->noContent(),
        );

        $this->assertSame(503, $response->getStatusCode());
        $this->assertSame([
            'message' => 'ASR is unavailable during pilot testing.',
            'code' => 'pilot_asr_unavailable',
        ], json_decode((string) $response->getContent(), true));
    }

    public function test_disabling_runtime_tts_forces_published_only_speech(): void
    {
        config()->set('pilot.runtime_tts_available', false);

        $policy = new LearnerSpeechPolicy(
            app(LearnerLightweightModeSettings::class),
        );

        $this->assertTrue($policy->isPublishedOnly());
        $this->assertSame([], $policy->runtimeProfiles(['result', 'instruction']));
    }

    public function test_production_pilot_accepts_missing_disabled_speech_tokens(): void
    {
        config()->set('app.debug', false);
        config()->set('app.url', 'https://api-pilot.readirect.org');
        config()->set('app.key', 'base64:test-key');
        config()->set('pilot.asr_available', false);
        config()->set('pilot.runtime_tts_available', false);
        config()->set('speech.asr_token', '');
        config()->set('speech.tts_token', '');
        config()->set('security.force_https', true);
        config()->set('security.trusted_hosts', ['^api-pilot\.readirect\.org$']);
        config()->set('security.trusted_proxies', ['127.0.0.1']);
        config()->set('security.headers.hsts_enabled', true);
        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp.scheme', 'smtp');
        config()->set('mail.mailers.smtp.host', 'smtp.gmail.com');
        config()->set('mail.mailers.smtp.port', 587);
        config()->set('mail.mailers.smtp.require_tls', true);
        config()->set('mail.mailers.smtp.username', 'mailer@example.com');
        config()->set('mail.mailers.smtp.password', 'abcdefghijklmnop');
        config()->set('mail.from.address', 'mailer@example.com');
        config()->set('mail.gmail.app_password', 'abcdefghijklmnop');

        app(DeploymentSecurity::class)->assertSafe('production');

        $this->addToAssertionCount(1);
    }

    public function test_pilot_catalog_uses_the_complete_approved_300_line_contract(): void
    {
        config()->set('pilot.published_speech_excluded_keys', [
            'learn-with-clara-words-rescue-opening',
            'learn-with-clara-words-find-bat',
            'learn-with-clara-words-find-can',
            'learn-with-clara-words-find-dot',
            'learn-with-clara-words-find-gap',
            'learn-with-clara-words-find-hot',
            'learn-with-clara-words-rescue-finale',
        ]);

        $english = app(PublishedTtsCatalogDefinitions::class)->english();
        $filipino = app(FilipinoTtsCatalogSource::class)->publicationDefinitions();

        $this->assertCount(300, $english);
        $this->assertCount(300, $filipino);
        $this->assertArrayNotHasKey(
            'learn-with-clara-words-rescue-opening',
            $english,
        );
    }
}
