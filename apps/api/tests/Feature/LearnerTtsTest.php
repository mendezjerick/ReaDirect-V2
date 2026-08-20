<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\LessonRun;
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
            'Hi. I am happy you are here. Let us get ready to read together.',
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

        foreach ($definitions as $speechKey => $definition) {
            $this->assertStringNotContainsString(
                '!',
                $definition['text'],
                "Clara speech cannot use exclamation marks: {$speechKey}",
            );
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

    public function test_lightweight_speech_migration_matches_the_active_catalog(): void
    {
        $definitions = $this->speechDefinitions();
        $migration = config('speech.pending_published_catalog_migrations.lightweight-v1');

        $this->assertArrayHasKey('lesson-1-feedback-incorrect-first', $definitions);
        $this->assertArrayHasKey('lesson-2-word-demo-bag', $definitions);
        $this->assertSame(
            'That is correct. You said the letter correctly with me.',
            $definitions['lesson-1-feedback-demonstrated']['text'],
        );
        $this->assertSame(
            'That is correct. You read the word correctly with me.',
            $definitions['lesson-2-feedback-demonstrated']['text'],
        );

        $this->assertIsArray($migration);
        $this->assertCount(53, $migration['new_lines']);
        $this->assertCount(2, $migration['replacement_lines']);
        $this->assertSame(
            'That word was not quite right. Let us try again.',
            $migration['new_lines']['lesson-2-feedback-incorrect-first']['text'],
        );
        $this->assertSame(
            'The word is bag. Listen: bag. Now you try.',
            $migration['new_lines']['lesson-2-word-demo-bag']['text'],
        );
        $this->assertSame(
            'That is correct. You said the letter correctly with me.',
            $migration['replacement_lines']['lesson-1-feedback-demonstrated']['text'],
        );
        $this->assertSame(
            'That is correct. You read the word correctly with me.',
            $migration['replacement_lines']['lesson-2-feedback-demonstrated']['text'],
        );
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

    public function test_sentence_alignment_feedback_uses_the_committed_difference(): void
    {
        $token = $this->createLearnerSession();
        $learner = Learner::query()->firstOrFail();
        $run = LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => 'required-lesson-4',
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_ACTIVE,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
        ]);
        $response = LessonResponse::query()->create([
            'lesson_run_id' => $run->id,
            'mission_key' => 'mission-1',
            'item_key' => 'lesson-v1-sentence-cat-mat',
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'a cat on a mat',
            'final_transcript' => 'a cat on a mat',
            'decision' => 'NEEDS_SUPPORT',
            'teaching_state' => 'GIVING_CLUE',
            'academic_attempt_count' => 1,
            'evidence' => [
                'transcript_alignment' => [
                    'diagnosis_key' => 'missing_word',
                    'primary_operation' => ['expected' => 'is'],
                ],
            ],
        ]);
        Http::fake([
            '*/synthesize' => Http::response('RIFF-runtime-feedback', 200, [
                'Content-Type' => 'audio/wav',
            ]),
        ]);

        $this->withToken($token)
            ->post("/api/learners/tts/lesson-feedback/{$response->id}")
            ->assertOk()
            ->assertHeader('X-ReaDirect-Sentence', 'a cat on a mat')
            ->assertHeader(
                'X-ReaDirect-Sentence-Diagnosis',
                'missing_word',
            )
            ->assertContent('RIFF-runtime-feedback');

        Http::assertSent(fn ($request): bool => $request->hasHeader(
            'Authorization',
            'Bearer '.config('speech.tts_token'),
        ) && $request->data() === [
            'text' => 'You missed the word is.',
            'reference' => 'result',
            'language' => 'en',
        ]);
    }

    public function test_first_incorrect_runtime_feedback_falls_back_to_approved_audio(): void
    {
        $token = $this->createLearnerSession();
        $learner = Learner::query()->firstOrFail();
        $run = LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => 'required-lesson-1',
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_ACTIVE,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
        ]);
        $response = LessonResponse::query()->create([
            'lesson_run_id' => $run->id,
            'mission_key' => 'mission-1',
            'item_key' => 'lesson-v1-letter-a',
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'b',
            'final_transcript' => 'B',
            'decision' => 'NEEDS_SUPPORT',
            'teaching_state' => 'GIVING_CLUE',
            'academic_attempt_count' => 1,
        ]);
        $this->publishSpeech(
            'lesson-1-feedback-incorrect-first',
            'That letter was not quite right. Let us try again.',
            'result',
            'RIFF-published-fallback',
        );
        Http::fake(['*/synthesize' => Http::response([], 503)]);

        $this->withToken($token)
            ->post("/api/learners/tts/lesson-feedback/{$response->id}")
            ->assertOk()
            ->assertHeader('X-ReaDirect-TTS-Source', 'published-fallback')
            ->assertHeader('X-ReaDirect-TTS-Fallback', 'runtime-unavailable')
            ->assertHeader('X-ReaDirect-Clara-Speech', 'lesson-1-feedback-incorrect-first')
            ->assertContent('RIFF-published-fallback');
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

    public function test_lesson_six_item_lines_match_the_authoritative_csv(): void
    {
        $path = dirname(__DIR__, 4)
            .'/content/lessons/v1/lesson-6-comprehension.csv';
        $handle = fopen($path, 'rb');
        $header = fgetcsv($handle);
        $expectedKeys = [];

        while (($values = fgetcsv($handle)) !== false) {
            $row = array_combine($header, $values);
            $slug = str_replace(
                'lesson-v1-comprehension-',
                '',
                $row['content_id'],
            );
            $expected = [
                "lesson-6-question-{$slug}" => $row['question_audio_text'],
                "lesson-6-guided-{$slug}" => trim(
                    "{$row['guided_clue']} {$row['question_audio_text']}",
                ),
                "lesson-6-demo-{$slug}" => $row['demonstration_text'],
                "lesson-6-correct-{$slug}" => $row[
                    'correct_feedback_text'
                ],
            ];

            foreach ($expected as $speechKey => $text) {
                $expectedKeys[] = $speechKey;
                $this->assertSame(
                    $text,
                    config("speech.clara_lines.{$speechKey}.text"),
                    "Lesson 6 speech is misaligned for {$speechKey}.",
                );
            }
        }
        fclose($handle);

        $configuredItemKeys = collect(config('speech.clara_lines'))
            ->keys()
            ->filter(
                fn (string $key): bool => preg_match(
                    '/^lesson-6-(question|guided|demo|correct)-/',
                    $key,
                ) === 1,
            )
            ->values()
            ->all();

        $this->assertSame(
            collect($expectedKeys)->sort()->values()->all(),
            collect($configuredItemKeys)->sort()->values()->all(),
        );
    }

    /** @return array<string, array{text: string, reference: string, path?: string}> */
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
