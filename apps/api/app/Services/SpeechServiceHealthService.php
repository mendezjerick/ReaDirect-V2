<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Throwable;

final class SpeechServiceHealthService
{
    /** @return array{asr: 'online'|'offline', tts: 'online'|'offline'} */
    public function readiness(): array
    {
        return [
            'asr' => $this->asrIsReady() ? 'online' : 'offline',
            'tts' => $this->runtimeTtsIsReady() ? 'online' : 'offline',
        ];
    }

    private function asrIsReady(): bool
    {
        try {
            $response = $this->healthClient()->get(
                rtrim((string) config('speech.asr_url'), '/').'/ready',
            );
            $payload = $response->json();

            return $response->successful()
                && is_array($payload)
                && ($payload['status'] ?? null) === 'ready';
        } catch (Throwable) {
            return false;
        }
    }

    private function runtimeTtsIsReady(): bool
    {
        try {
            $response = $this->healthClient()->get(
                rtrim((string) config('speech.tts_url'), '/').'/health',
            );
            $payload = $response->json();

            return $response->successful()
                && is_array($payload)
                && ($payload['runtime_ready'] ?? false) === true;
        } catch (Throwable) {
            return false;
        }
    }

    private function healthClient(): PendingRequest
    {
        return Http::acceptJson()
            ->connectTimeout(1)
            ->timeout(2);
    }
}
