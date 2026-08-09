<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\ActivitySpeechManifestService;
use App\Support\SpeechLanguage;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class LearnerSpeechLanguageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('tts_catalog');
        Http::preventStrayRequests();
    }

    public function test_learner_session_defaults_to_english_speech(): void
    {
        [, $token] = $this->learnerSession();

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('learner.speech_language', SpeechLanguage::ENGLISH);
    }

    public function test_language_contract_reports_catalog_availability(): void
    {
        $this->publishVoice(SpeechLanguage::ENGLISH, 'clara-sh-v1');
        [, $token] = $this->learnerSession();

        $this->withToken($token)
            ->getJson('/api/learners/tts/language')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('speech_language', SpeechLanguage::ENGLISH)
            ->assertJsonPath('languages.0.code', SpeechLanguage::ENGLISH)
            ->assertJsonPath('languages.0.label', 'English')
            ->assertJsonPath('languages.0.available', true)
            ->assertJsonPath('languages.0.selected', true)
            ->assertJsonPath('languages.1.code', SpeechLanguage::FILIPINO)
            ->assertJsonPath('languages.1.label', 'Filipino')
            ->assertJsonPath('languages.1.available', false)
            ->assertJsonPath('languages.1.selected', false);
    }

    public function test_unpublished_language_cannot_be_selected(): void
    {
        [$learner, $token] = $this->learnerSession();

        $this->withToken($token)
            ->putJson('/api/learners/tts/language', [
                'speech_language' => SpeechLanguage::FILIPINO,
            ])
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'The Filipino speech catalog is not available yet.',
            );

        $this->assertSame(
            SpeechLanguage::ENGLISH,
            $learner->fresh()->speech_language,
        );
    }

    public function test_only_supported_language_codes_are_accepted(): void
    {
        [, $token] = $this->learnerSession();

        $this->withToken($token)
            ->putJson('/api/learners/tts/language', [
                'speech_language' => 'tl',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['speech_language']);
    }

    public function test_published_filipino_catalog_allows_persistent_selection(): void
    {
        Config::set('speech.tts_reference_profiles_by_language.fil-PH', [
            'instruction',
            'result',
        ]);
        $this->publishVoice(SpeechLanguage::ENGLISH, 'clara-sh-v1');
        $this->publishVoice(SpeechLanguage::FILIPINO, 'clara-sh-fil-v1');
        [$learner, $token] = $this->learnerSession();

        $this->withToken($token)
            ->putJson('/api/learners/tts/language', [
                'speech_language' => SpeechLanguage::FILIPINO,
            ])
            ->assertOk()
            ->assertJsonPath('speech_language', SpeechLanguage::FILIPINO)
            ->assertJsonPath('languages.0.selected', false)
            ->assertJsonPath('languages.1.available', true)
            ->assertJsonPath('languages.1.selected', true);

        $this->assertSame(
            SpeechLanguage::FILIPINO,
            $learner->fresh()->speech_language,
        );

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('learner.speech_language', SpeechLanguage::FILIPINO);
    }

    public function test_published_filipino_catalog_remains_unavailable_without_live_profile_coverage(): void
    {
        Config::set('speech.tts_reference_profiles_by_language.fil-PH', [
            'instruction',
        ]);
        $this->publishVoice(SpeechLanguage::FILIPINO, 'clara-sh-fil-v1');
        [$learner, $token] = $this->learnerSession();

        $this->withToken($token)
            ->getJson('/api/learners/tts/language')
            ->assertOk()
            ->assertJsonPath('languages.1.code', SpeechLanguage::FILIPINO)
            ->assertJsonPath('languages.1.available', false);

        $this->withToken($token)
            ->putJson('/api/learners/tts/language', [
                'speech_language' => SpeechLanguage::FILIPINO,
            ])
            ->assertStatus(409);

        $this->assertSame(
            SpeechLanguage::ENGLISH,
            $learner->fresh()->speech_language,
        );
    }

    public function test_published_playback_uses_only_the_learner_language_catalog(): void
    {
        $englishVoice = $this->publishVoice(SpeechLanguage::ENGLISH, 'clara-sh-v1');
        $filipinoVoice = $this->publishVoice(
            SpeechLanguage::FILIPINO,
            'clara-sh-fil-v1',
        );
        $this->publishLine(
            $englishVoice,
            'lesson-intro',
            'RIFF-english-intro',
            'sh/lesson-intro/lesson-intro.wav',
        );
        $this->publishLine(
            $filipinoVoice,
            'lesson-intro',
            'RIFF-filipino-intro',
            'sh-fil/lesson-intro/lesson-intro.wav',
        );
        [, $token] = $this->learnerSession(SpeechLanguage::FILIPINO);

        $this->withToken($token)
            ->post('/api/learners/tts/speech/lesson-intro')
            ->assertOk()
            ->assertHeader('X-ReaDirect-TTS-Voice', 'clara-sh-fil-v1')
            ->assertHeader('X-ReaDirect-TTS-Language', SpeechLanguage::FILIPINO)
            ->assertContent('RIFF-filipino-intro');

        Http::assertNothingSent();
    }

    public function test_readiness_never_borrows_english_lines_for_filipino(): void
    {
        $englishVoice = $this->publishVoice(SpeechLanguage::ENGLISH, 'clara-sh-v1');
        $this->publishVoice(SpeechLanguage::FILIPINO, 'clara-sh-fil-v1');
        $manifest = app(ActivitySpeechManifestService::class)
            ->forActivity('assessment-part-one');
        foreach ($manifest['published_speech_keys'] as $speechKey) {
            $this->publishLine(
                $englishVoice,
                $speechKey,
                "RIFF-english-{$speechKey}",
                "sh/readiness/{$speechKey}.wav",
            );
        }
        [, $token] = $this->learnerSession(SpeechLanguage::FILIPINO);

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness', [
                'activity' => 'assessment-part-one',
            ])
            ->assertServiceUnavailable()
            ->assertJsonPath('speech_language', SpeechLanguage::FILIPINO)
            ->assertJsonPath('voice_version', 'clara-sh-fil-v1')
            ->assertJsonPath('published_ready', false)
            ->assertJsonCount(
                count($manifest['published_speech_keys']),
                'unavailable_speech_keys',
            );

        Http::assertNothingSent();
    }

    public function test_runtime_demonstration_uses_the_filipino_template_and_reference_language(): void
    {
        $this->publishVoice(SpeechLanguage::FILIPINO, 'clara-sh-fil-v1');
        [$learner, $token] = $this->learnerSession(SpeechLanguage::FILIPINO);
        $run = LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => 'required-lesson-2',
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_ACTIVE,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [
                'mission-1' => [[
                    'content_id' => 'lesson-v1-word-cat',
                    'spoken_target' => 'cat',
                ]],
            ],
        ]);
        $response = LessonResponse::query()->create([
            'lesson_run_id' => $run->id,
            'mission_key' => 'mission-1',
            'item_key' => 'lesson-v1-word-cat',
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'cap',
            'final_transcript' => 'cap',
            'decision' => 'NEEDS_SUPPORT',
            'teaching_state' => 'DEMONSTRATING',
            'academic_attempt_count' => 2,
        ]);
        Http::fake([
            '*/synthesize' => Http::response('RIFF-filipino-runtime', 200, [
                'Content-Type' => 'audio/wav',
                'X-ReaDirect-TTS-Language' => SpeechLanguage::FILIPINO,
            ]),
        ]);

        $this->withToken($token)
            ->post("/api/learners/tts/lesson-demonstration/{$response->id}")
            ->assertOk()
            ->assertHeader('X-ReaDirect-TTS-Source', 'runtime-cache')
            ->assertHeader('X-ReaDirect-TTS-Language', SpeechLanguage::FILIPINO)
            ->assertContent('RIFF-filipino-runtime');

        Http::assertSent(fn ($request): bool => $request->data() === [
            'text' => 'Ang salita ay cat. Makinig: cat. Ngayon, ikaw naman.',
            'reference' => 'instruction',
            'language' => SpeechLanguage::FILIPINO,
        ]);
    }

    private function publishVoice(string $language, string $stableKey): TtsVoiceVersion
    {
        return TtsVoiceVersion::query()->create([
            'stable_key' => $stableKey,
            'language_code' => $language,
            'engine' => 'VoxCPM2',
            'model_identifier' => 'openbmb/VoxCPM2',
            'reference_set' => $language === SpeechLanguage::FILIPINO ? 'sh-fil' : 'sh',
            'conditioning_version' => 'mono-peak-minus-6db-v1',
            'synthesis_config' => ['cfg_value' => 2.0],
            'status' => TtsVoiceVersion::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
    }

    private function publishLine(
        TtsVoiceVersion $voice,
        string $speechKey,
        string $audio,
        string $path,
    ): TtsSpeechLine {
        Storage::disk('tts_catalog')->put($path, $audio);

        return TtsSpeechLine::query()->create([
            'tts_voice_version_id' => $voice->id,
            'speech_key' => $speechKey,
            'text' => "Approved {$speechKey}",
            'reference_role' => 'instruction',
            'audio_storage_disk' => 'tts_catalog',
            'audio_storage_path' => $path,
            'audio_sha256' => hash('sha256', $audio),
            'duration_ms' => 1000,
            'status' => TtsSpeechLine::STATUS_PUBLISHED,
            'generated_at' => now(),
            'approved_at' => now(),
        ]);
    }

    /** @return array{Learner, string} */
    private function learnerSession(string $language = SpeechLanguage::ENGLISH): array
    {
        $learner = Learner::query()->create([
            'learner_code' => 'SL001',
            'speech_language' => $language,
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'before_diagnostic',
        ]);
        $token = 'learner-speech-language-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [$learner, $token];
    }
}
