<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class LearnerTtsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('tts_catalog');
        Http::preventStrayRequests();
    }

    public function test_lesson_intro_streams_published_audio_without_calling_vox(): void
    {
        $audio = 'RIFF-published-lesson-intro';
        $this->publishSpeech(
            'lesson-intro',
            'Hi! I am happy you are here. Let us get ready to read together!',
            'introduce',
            $audio,
        );
        $token = $this->createLearnerSession();

        $this->withToken($token)
            ->post('/api/learners/tts/speech/lesson-intro')
            ->assertOk()
            ->assertHeader('Content-Type', 'audio/wav')
            ->assertHeader('X-ReaDirect-Clara-Speech', 'lesson-intro')
            ->assertHeader('X-ReaDirect-TTS-Source', 'published')
            ->assertHeader('X-ReaDirect-TTS-Voice', 'clara-sh-v1')
            ->assertContent($audio);

        Http::assertNothingSent();
    }

    public function test_clara_speech_requires_a_live_learner_session(): void
    {
        $this->post('/api/learners/tts/speech/lesson-intro')
            ->assertUnauthorized();

        Http::assertNothingSent();
    }

    public function test_every_current_fixed_line_streams_from_the_published_catalog(): void
    {
        $token = $this->createLearnerSession();
        $definitions = $this->speechDefinitions();

        $this->assertCount(33, $definitions);
        foreach ($definitions as $speechKey => $definition) {
            $audio = "RIFF-published-{$speechKey}";
            $this->publishSpeech(
                $speechKey,
                $definition['text'],
                $definition['reference'],
                $audio,
            );

            $this->withToken($token)
                ->post("/api/learners/tts/speech/{$speechKey}")
                ->assertOk()
                ->assertHeader('X-ReaDirect-Clara-Speech', $speechKey)
                ->assertHeader('X-ReaDirect-TTS-Source', 'published')
                ->assertContent($audio);
        }

        Http::assertNothingSent();
    }

    public function test_unknown_speech_keys_are_not_forwarded(): void
    {
        $token = $this->createLearnerSession();

        foreach ([
            'not-a-real-line',
            'assessment-letters-item-1',
            'assessment-words-item-11',
            'assessment-stories-item-2',
        ] as $speechKey) {
            $this->withToken($token)
                ->post("/api/learners/tts/speech/{$speechKey}")
                ->assertNotFound();
        }

        Http::assertNothingSent();
    }

    public function test_missing_or_modified_published_audio_never_falls_back_to_vox(): void
    {
        $token = $this->createLearnerSession();
        $missing = $this->publishSpeech(
            'assessment-letters',
            'Say the letter you see.',
            'instruction',
            'RIFF-original-letters',
        );
        $modified = $this->publishSpeech(
            'assessment-rhymes',
            'Look at both words.',
            'question',
            'RIFF-original-rhymes',
        );
        Storage::disk('tts_catalog')->delete($missing->audio_storage_path);
        Storage::disk('tts_catalog')->put(
            $modified->audio_storage_path,
            'RIFF-unapproved-replacement',
        );

        $this->withToken($token)
            ->post('/api/learners/tts/speech/assessment-letters')
            ->assertServiceUnavailable();
        $this->withToken($token)
            ->post('/api/learners/tts/speech/assessment-rhymes')
            ->assertServiceUnavailable();

        Http::assertNothingSent();
    }

    /** @return array<string, array{text: string, reference: string}> */
    private function speechDefinitions(): array
    {
        $definitions = config('speech.clara_lines');
        $ordinals = config('speech.assessment_item_cues.ordinals');

        foreach (config('speech.assessment_item_cues.tasks') as $task => $definition) {
            foreach ($ordinals as $position => $ordinal) {
                $definitions["assessment-{$task}-item-{$position}"] = [
                    'text' => sprintf($definition['text'], $ordinal),
                    'reference' => $definition['reference'],
                ];
            }
        }

        return $definitions;
    }

    private function publishSpeech(
        string $speechKey,
        string $text,
        string $reference,
        string $audio,
    ): TtsSpeechLine {
        $voice = TtsVoiceVersion::query()->firstOrCreate(
            ['stable_key' => 'clara-sh-v1'],
            [
                'engine' => 'VoxCPM2',
                'model_identifier' => 'openbmb/VoxCPM2',
                'reference_set' => 'sh',
                'conditioning_version' => 'mono-peak-minus-6db-v1',
                'synthesis_config' => ['cfg_value' => 2.0],
                'status' => TtsVoiceVersion::STATUS_PUBLISHED,
                'published_at' => now(),
            ],
        );
        $path = "sh/{$speechKey}.wav";
        Storage::disk('tts_catalog')->put($path, $audio);

        return TtsSpeechLine::query()->create([
            'tts_voice_version_id' => $voice->id,
            'speech_key' => $speechKey,
            'text' => $text,
            'reference_role' => $reference,
            'audio_storage_disk' => 'tts_catalog',
            'audio_storage_path' => $path,
            'audio_sha256' => hash('sha256', $audio),
            'duration_ms' => 1000,
            'status' => TtsSpeechLine::STATUS_PUBLISHED,
            'generated_at' => now(),
            'approved_at' => now(),
        ]);
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
