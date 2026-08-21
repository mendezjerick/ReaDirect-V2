<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class SpeechServiceReadinessTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    #[DataProvider('serviceStates')]
    public function test_public_readiness_reports_only_the_learner_facing_service_states(
        int $asrStatus,
        array $asrPayload,
        int $ttsStatus,
        array $ttsPayload,
        string $expectedAsr,
        string $expectedTts,
    ): void {
        Http::fake([
            'http://127.0.0.1:8001/ready' => Http::response($asrPayload, $asrStatus),
            'http://127.0.0.1:8002/health' => Http::response($ttsPayload, $ttsStatus),
        ]);

        $this->getJson('/api/speech/readiness')
            ->assertOk()
            ->assertExactJson([
                'asr' => $expectedAsr,
                'tts' => $expectedTts,
            ]);
    }

    public static function serviceStates(): array
    {
        return [
            'both online' => [
                200,
                ['status' => 'ready'],
                200,
                ['runtime_ready' => true],
                'online',
                'online',
            ],
            'ASR offline' => [
                503,
                ['status' => 'loading'],
                200,
                ['runtime_ready' => true],
                'offline',
                'online',
            ],
            'runtime TTS offline' => [
                200,
                ['status' => 'ready'],
                503,
                ['runtime_ready' => false],
                'online',
                'offline',
            ],
            'both offline' => [
                503,
                ['status' => 'loading'],
                503,
                ['runtime_ready' => false],
                'offline',
                'offline',
            ],
        ];
    }
}
