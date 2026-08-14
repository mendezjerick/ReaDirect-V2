<?php

namespace App\Support;

use LogicException;

final class DeploymentSecurity
{
    public function __construct(
        private readonly GmailSmtpConfiguration $gmail,
    ) {}

    public function assertSafe(string $environment): void
    {
        if ($environment !== 'production') {
            return;
        }

        if (config('app.debug')) {
            throw new LogicException('APP_DEBUG must be false in production.');
        }

        if (! config('security.force_https')) {
            throw new LogicException('APP_FORCE_HTTPS must be true in production.');
        }

        if (parse_url((string) config('app.url'), PHP_URL_SCHEME) !== 'https') {
            throw new LogicException('APP_URL must use https in production.');
        }

        if (trim((string) config('app.key')) === '') {
            throw new LogicException('APP_KEY must be configured in production.');
        }

        $asrToken = trim((string) config('speech.asr_token'));
        $ttsToken = trim((string) config('speech.tts_token'));

        $asrAvailable = (bool) config('pilot.asr_available', true);
        $runtimeTtsAvailable = (bool) config('pilot.runtime_tts_available', true);

        if ($asrAvailable && strlen($asrToken) < 32) {
            throw new LogicException('ASR_SERVICE_TOKEN must contain at least 32 characters in production.');
        }

        if ($runtimeTtsAvailable && strlen($ttsToken) < 32) {
            throw new LogicException('TTS_SERVICE_TOKEN must contain at least 32 characters in production.');
        }

        if ($asrAvailable
            && $runtimeTtsAvailable
            && hash_equals($asrToken, $ttsToken)) {
            throw new LogicException('ASR_SERVICE_TOKEN and TTS_SERVICE_TOKEN must use distinct values in production.');
        }

        if (config('security.trusted_hosts', []) === []) {
            throw new LogicException('At least one TRUSTED_HOSTS entry is required in production.');
        }

        if (! config('security.headers.hsts_enabled')) {
            throw new LogicException('SECURITY_HSTS_ENABLED must be true in production.');
        }

        $this->gmail->assertConfigured();

        $trustedProxies = config('security.trusted_proxies', []);
        if (array_intersect(['*', '**'], is_array($trustedProxies) ? $trustedProxies : [])) {
            throw new LogicException('Wildcard trusted proxies are forbidden in production.');
        }
    }
}
