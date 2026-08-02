<?php

namespace Tests\Feature;

use App\Support\DeploymentSecurity;
use LogicException;
use Tests\TestCase;

final class DeploymentSecurityTest extends TestCase
{
    public function test_api_responses_include_security_headers(): void
    {
        $this->getJson('/up')
            ->assertOk()
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
            ->assertHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeaderMissing('Strict-Transport-Security');
    }

    public function test_plain_http_is_rejected_when_https_is_required(): void
    {
        config()->set('security.force_https', true);

        $this->getJson('/up')
            ->assertStatus(426)
            ->assertJsonPath('message', 'HTTPS is required for this service.')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_https_forwarded_by_a_trusted_proxy_is_accepted(): void
    {
        config()->set('security.force_https', true);
        config()->set('security.headers.hsts_enabled', true);
        config()->set('security.headers.hsts_include_subdomains', true);

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeader('X-Forwarded-Proto', 'https')
            ->getJson('/up')
            ->assertOk()
            ->assertHeader(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains',
            );
    }

    public function test_https_header_from_an_untrusted_client_is_ignored(): void
    {
        config()->set('security.force_https', true);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->withHeader('X-Forwarded-Proto', 'https')
            ->getJson('/up')
            ->assertStatus(426)
            ->assertJsonPath('message', 'HTTPS is required for this service.');
    }

    public function test_production_configuration_fails_closed_when_debug_is_enabled(): void
    {
        config()->set('app.debug', true);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('APP_DEBUG must be false in production.');

        app(DeploymentSecurity::class)->assertSafe('production');
    }

    public function test_complete_production_configuration_is_accepted(): void
    {
        config()->set('app.debug', false);
        config()->set('app.url', 'https://readirect.example');
        config()->set('app.key', 'base64:test-key');
        config()->set('speech.asr_token', str_repeat('a', 32));
        config()->set('speech.tts_token', str_repeat('t', 32));
        config()->set('security.force_https', true);
        config()->set('security.trusted_hosts', ['^readirect\\.example$']);
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

    public function test_production_configuration_rejects_non_delivery_mail_transports(): void
    {
        config()->set('app.debug', false);
        config()->set('app.url', 'https://readirect.example');
        config()->set('app.key', 'base64:test-key');
        config()->set('speech.asr_token', str_repeat('a', 32));
        config()->set('speech.tts_token', str_repeat('t', 32));
        config()->set('security.force_https', true);
        config()->set('security.trusted_hosts', ['^readirect\\.example$']);
        config()->set('security.trusted_proxies', ['127.0.0.1']);
        config()->set('security.headers.hsts_enabled', true);
        config()->set('mail.default', 'log');

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('MAIL_MAILER must be smtp for Gmail delivery.');

        app(DeploymentSecurity::class)->assertSafe('production');
    }

    public function test_production_configuration_rejects_a_missing_gmail_app_password(): void
    {
        config()->set('app.debug', false);
        config()->set('app.url', 'https://readirect.example');
        config()->set('app.key', 'base64:test-key');
        config()->set('speech.asr_token', str_repeat('a', 32));
        config()->set('speech.tts_token', str_repeat('t', 32));
        config()->set('security.force_https', true);
        config()->set('security.trusted_hosts', ['^readirect\\.example$']);
        config()->set('security.trusted_proxies', ['127.0.0.1']);
        config()->set('security.headers.hsts_enabled', true);
        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp.scheme', 'smtp');
        config()->set('mail.mailers.smtp.host', 'smtp.gmail.com');
        config()->set('mail.mailers.smtp.port', 587);
        config()->set('mail.mailers.smtp.require_tls', true);
        config()->set('mail.mailers.smtp.username', 'mailer@example.com');
        config()->set('mail.mailers.smtp.password', '');
        config()->set('mail.from.address', 'mailer@example.com');
        config()->set('mail.gmail.app_password', '');

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('GMAIL_APP_PASSWORD must be a 16-character Google App Password without spaces.');

        app(DeploymentSecurity::class)->assertSafe('production');
    }

    public function test_production_configuration_rejects_a_missing_speech_credential(): void
    {
        config()->set('app.debug', false);
        config()->set('app.url', 'https://readirect.example');
        config()->set('app.key', 'base64:test-key');
        config()->set('speech.asr_token', '');
        config()->set('security.force_https', true);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('ASR_SERVICE_TOKEN must contain at least 32 characters in production.');

        app(DeploymentSecurity::class)->assertSafe('production');
    }

    public function test_production_configuration_rejects_reused_speech_credentials(): void
    {
        config()->set('app.debug', false);
        config()->set('app.url', 'https://readirect.example');
        config()->set('app.key', 'base64:test-key');
        config()->set('speech.asr_token', str_repeat('s', 32));
        config()->set('speech.tts_token', str_repeat('s', 32));
        config()->set('security.force_https', true);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('ASR_SERVICE_TOKEN and TTS_SERVICE_TOKEN must use distinct values in production.');

        app(DeploymentSecurity::class)->assertSafe('production');
    }
}
