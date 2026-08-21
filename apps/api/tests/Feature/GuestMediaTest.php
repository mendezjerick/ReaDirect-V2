<?php

namespace Tests\Feature;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class GuestMediaTest extends TestCase
{
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
