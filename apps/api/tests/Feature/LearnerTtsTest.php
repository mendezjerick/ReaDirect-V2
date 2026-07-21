<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerSession;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerTtsTest extends TestCase
{
    public function test_lesson_intro_uses_the_introduction_reference_and_returns_audio(): void
    {
        Http::fake([
            'http://127.0.0.1:8002/synthesize' => Http::response(
                'RIFF-test-wave',
                200,
                ['Content-Type' => 'audio/wav'],
            ),
        ]);
        $token = $this->createLearnerSession();

        $this->withToken($token)
            ->post('/api/learners/tts/speech/lesson-intro')
            ->assertOk()
            ->assertHeader('Content-Type', 'audio/wav')
            ->assertHeader('X-ReaDirect-Clara-Speech', 'lesson-intro')
            ->assertContent('RIFF-test-wave');

        Http::assertSent(fn ($request): bool => $request->url() === 'http://127.0.0.1:8002/synthesize'
            && $request['reference'] === 'introduce'
            && $request['text'] === 'Hi! I am happy you are here. Let us get ready to read together!');
    }

    public function test_clara_speech_requires_a_live_learner_session(): void
    {
        $this->post('/api/learners/tts/speech/lesson-intro')
            ->assertUnauthorized();

        Http::assertNothingSent();
    }

    public function test_unknown_speech_keys_are_not_forwarded(): void
    {
        $token = $this->createLearnerSession();

        $this->withToken($token)
            ->post('/api/learners/tts/speech/not-a-real-line')
            ->assertNotFound();

        Http::assertNothingSent();
    }

    private function createLearnerSession(): string
    {
        $learner = Learner::query()->create([
            'learner_code' => 'AA001',
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        $plainToken = 'learner-tts-test-token';

        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $plainToken),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return $plainToken;
    }
}
