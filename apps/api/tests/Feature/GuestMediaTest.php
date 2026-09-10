<?php

namespace Tests\Feature;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\LearnerLightweightModeSettings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class GuestMediaTest extends TestCase
{
    public function test_guest_feedback_uses_existing_templates_without_creating_learner_records(): void
    {
        Http::fake(['*/synthesize' => Http::response('RIFF-feedback', 200, [
            'Content-Type' => 'audio/wav', 'X-ReaDirect-TTS-Language' => 'en',
        ])]);
        $this->postJson('/api/guest/tts/lesson-feedback', [
            'lesson' => 1, 'transcript' => 'B', 'language' => 'en',
        ])->assertOk()->assertContent('RIFF-feedback')->assertHeader('X-ReaDirect-TTS-Source', 'guest-runtime');
        Http::assertSent(fn ($request) => $request['text'] === 'You said bee.' && $request['reference'] === 'result');
        $this->assertDatabaseCount('learners', 0);
        $this->assertDatabaseCount('learner_sessions', 0);
        $this->assertDatabaseCount('lesson_responses', 0);
    }

    public function test_guest_feedback_supports_filipino_and_unclear_speech(): void
    {
        Http::fake(['*/synthesize' => Http::response('RIFF-feedback', 200, ['X-ReaDirect-TTS-Language' => 'fil-PH'])]);
        $this->postJson('/api/guest/tts/lesson-feedback', [
            'lesson' => 2, 'transcript' => 'bed', 'language' => 'fil-PH',
        ])->assertOk();
        Http::assertSent(fn ($request) => $request['text'] === 'Ang sinabi mo ay bed.' && $request['language'] === 'fil-PH');
        $this->postJson('/api/guest/tts/lesson-feedback', [
            'lesson' => 4, 'transcript' => null, 'language' => 'fil-PH',
        ])->assertOk();
        Http::assertSent(fn ($request) => $request['text'] === 'Hindi ako nakarinig ng malinaw na pangungusap. Maaari mong subukan ang susunod.');
    }

    public function test_guest_feedback_validates_input_before_synthesis(): void
    {
        Http::fake();
        foreach ([['lesson' => 5], ['transcript' => str_repeat('a', 501)], ['language' => 'invalid']] as $invalid) {
            $this->postJson('/api/guest/tts/lesson-feedback', array_replace([
                'lesson' => 2, 'transcript' => 'bed', 'language' => 'en',
            ], $invalid))->assertUnprocessable();
        }
        Http::assertNothingSent();
    }

    public function test_guest_feedback_degrades_safely_when_tts_fails(): void
    {
        Http::fake(['*/synthesize' => Http::response('unavailable', 503)]);
        $this->postJson('/api/guest/tts/lesson-feedback', [
            'lesson' => 2, 'transcript' => 'bed', 'language' => 'en',
        ])->assertStatus(503)->assertJsonPath('message', 'Prepared feedback is available.');
    }

    public function test_guest_feedback_respects_published_only_policy(): void
    {
        app(LearnerLightweightModeSettings::class)->update([
            'enabled' => true, 'static_clara' => true, 'published_speech_only' => true,
        ]);
        Http::fake();
        $this->postJson('/api/guest/tts/lesson-feedback', [
            'lesson' => 2, 'transcript' => 'bed', 'language' => 'en',
        ])->assertStatus(409);
        Http::assertNothingSent();
    }

    public function test_guest_speech_evaluation_is_stateless_and_needs_no_account(): void
    {
        Http::fake([
            'http://127.0.0.1:8001/mu/transcribe' => Http::response([
                'raw_transcript' => 'bag',
                'audio_quality' => ['usable' => true],
            ]),
        ]);

        $this->post('/api/guest/speech/evaluate', [
            'mode' => 'word',
            'target' => 'bag',
            'audio' => UploadedFile::fake()->create('guest.webm', 12, 'audio/webm'),
        ])
            ->assertOk()
            ->assertJsonPath('correct', true)
            ->assertJsonPath('transcript', 'bag')
            ->assertJsonPath('usable', true);

        $this->assertDatabaseCount('learners', 0);
        $this->assertDatabaseCount('learner_sessions', 0);
    }

    public function test_guest_can_stream_only_published_clara_audio(): void
    {
        Storage::fake('tts_catalog');
        $audio = 'RIFF-guest-published';
        $voice = TtsVoiceVersion::query()->create([
            'stable_key' => 'clara-guest-v1',
            'language_code' => 'en',
            'engine' => 'vox',
            'model_identifier' => 'test',
            'reference_set' => 'test',
            'conditioning_version' => 'v1',
            'synthesis_config' => [],
            'status' => TtsVoiceVersion::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
        Storage::disk('tts_catalog')->put('guest/lesson-intro.wav', $audio);
        TtsSpeechLine::query()->create([
            'tts_voice_version_id' => $voice->id,
            'speech_key' => 'lesson-intro',
            'text' => 'Welcome.',
            'reference_role' => 'introduce',
            'audio_storage_disk' => 'tts_catalog',
            'audio_storage_path' => 'guest/lesson-intro.wav',
            'audio_sha256' => hash('sha256', $audio),
            'duration_ms' => 1000,
            'status' => TtsSpeechLine::STATUS_PUBLISHED,
            'generated_at' => now(),
            'approved_at' => now(),
        ]);

        $this->post('/api/guest/tts/speech/lesson-intro?language=en')
            ->assertOk()
            ->assertHeader('X-ReaDirect-TTS-Source', 'guest-published')
            ->assertHeader('X-ReaDirect-TTS-Language', 'en')
            ->assertContent($audio);
    }
}
