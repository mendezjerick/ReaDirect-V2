<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerLessonThreeTest extends TestCase
{
    public function test_published_phrase_pool_never_begins_with_the_article_a(): void
    {
        $path = base_path('../../content/lessons/v1/lesson-3-phrases.csv');
        $stream = fopen($path, 'rb');
        $this->assertNotFalse($stream);

        $headers = fgetcsv($stream);
        $this->assertIsArray($headers);
        $phrases = [];

        while (($values = fgetcsv($stream)) !== false) {
            $row = array_combine($headers, $values);
            $this->assertIsArray($row);

            if ($row['status'] === 'active') {
                $phrases[] = $row['spoken_target'];
            }
        }

        fclose($stream);

        $this->assertCount(20, $phrases);
        foreach ($phrases as $phrase) {
            $this->assertDoesNotMatchRegularExpression('/^a\s/i', $phrase);
        }
    }

    public function test_start_locks_five_unique_phrases_and_resumes_the_run(): void
    {
        [$token, $learner] = $this->learnerSession('A');

        $response = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-3/start')
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-3')
            ->assertJsonPath('mission.key', 'mission-1')
            ->assertJsonPath('mission.total', 1)
            ->assertJsonPath('progress.current', 1)
            ->assertJsonPath('progress.total', 5)
            ->assertJsonPath('item.presentation', 'display_phrase')
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-3-mission-1');

        $run = LessonRun::query()->findOrFail($response->json('run_id'));
        $items = collect($run->content_snapshot['mission-1']);

        $this->assertCount(5, $items);
        $this->assertCount(5, $items->pluck('target_key')->unique());
        $this->assertArrayNotHasKey('spoken_target', $response->json('item'));
        $this->assertSame(
            5,
            DB::table('lesson_target_exposures')
                ->where('learner_id', $learner->id)
                ->where('scope_key', 'required.lesson-3.phrase-targets')
                ->where('cycle', 1)
                ->count(),
        );

        $this->withToken($token)
            ->post('/api/learners/lessons/lesson-3/start')
            ->assertOk()
            ->assertJsonPath('run_id', $run->id)
            ->assertJsonPath('item.item_key', $response->json('item.item_key'));
    }

    public function test_phrase_submission_uses_mu_and_persists_resolved_evidence(): void
    {
        [$token] = $this->learnerSession('B');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-3/start')
            ->json();
        $expected = $start['item']['display_text'];
        Http::fake([
            '*/mu/transcribe' => Http::response([
                'raw_transcript' => strtoupper($expected).'.',
                'basic_normalized_transcript' => $expected,
                'audio_quality' => ['usable' => true, 'warnings' => []],
                'noise_reduction' => ['requires_retry' => false],
            ]),
        ]);

        $this->withToken($token)
            ->post(
                "/api/learners/lessons/lesson-3/{$start['run_id']}/submit",
                [
                    'item_key' => $start['item']['item_key'],
                    'audio' => UploadedFile::fake()->create(
                        'phrase.webm',
                        12,
                        'audio/webm',
                    ),
                ],
            )
            ->assertOk()
            ->assertJsonPath('response.final_transcript', $expected)
            ->assertJsonPath('response.outcome', 'INDEPENDENT_CORRECT')
            ->assertJsonPath('teaching.can_advance', true)
            ->assertJsonPath('support.speech.0.kind', 'runtime_feedback')
            ->assertJsonPath(
                'support.speech.1.speech_key',
                'lesson-3-feedback-independent',
            );

        $this->assertSame(
            strtoupper($expected).'.',
            LessonResponse::query()->firstOrFail()->raw_transcript,
        );
        Http::assertSent(
            fn ($request): bool => str_ends_with(
                $request->url(),
                '/mu/transcribe',
            )
                && str_contains($request->body(), 'name="task_type"')
                && str_contains($request->body(), "\r\n\r\nphrase\r\n"),
        );
    }

    public function test_missing_phrase_word_is_persisted_and_spoken_as_targeted_feedback(): void
    {
        [$token] = $this->learnerSession('M');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-3/start')
            ->json();
        $expectedTokens = explode(' ', $start['item']['display_text']);
        $missingWord = $expectedTokens[1];
        $committedTokens = $expectedTokens;
        unset($committedTokens[1]);
        $committed = implode(' ', array_values($committedTokens));
        Http::fake([
            '*/mu/transcribe' => Http::response($this->muEvidence($committed)),
            '*/synthesize' => Http::response(
                'wave-bytes',
                200,
                ['Content-Type' => 'audio/wav'],
            ),
        ]);

        $state = $this->withToken($token)
            ->post(
                "/api/learners/lessons/lesson-3/{$start['run_id']}/submit",
                [
                    'item_key' => $start['item']['item_key'],
                    'audio' => UploadedFile::fake()->create(
                        'missing-word.webm',
                        12,
                        'audio/webm',
                    ),
                ],
            )
            ->assertOk()
            ->assertJsonPath('response.final_transcript', $committed)
            ->assertJsonPath('response.diagnosis_key', 'missing_word')
            ->assertJsonPath('teaching.state', 'GIVING_CLUE')
            ->assertJsonPath('practice_tries.count', 1)
            ->assertJsonPath(
                'practice_tries.entries.0.final_transcript',
                $committed,
            )
            ->assertJsonPath('practice_tries.entries.0.attempt_number', 1)
            ->json();

        $response = LessonResponse::query()->findOrFail(
            $state['response']['id'],
        );
        $this->assertSame(
            'word_levenshtein_v1',
            $response->evidence['transcript_alignment']['algorithm'],
        );
        $this->assertSame(
            $missingWord,
            $response->evidence['transcript_alignment']['primary_operation']['expected'],
        );

        $this->withToken($token)
            ->post("/api/learners/tts/lesson-feedback/{$response->id}")
            ->assertOk()
            ->assertHeader('X-ReaDirect-Phrase', $committed)
            ->assertHeader(
                'X-ReaDirect-Phrase-Diagnosis',
                'missing_word',
            );

        Http::assertSent(
            fn ($request): bool => str_ends_with(
                $request->url(),
                '/synthesize',
            )
                && $request['text'] === "You missed the word {$missingWord}."
                && $request['reference'] === 'result',
        );
    }

    public function test_second_failed_attempt_uses_a_published_phrase_demonstration(): void
    {
        [$token] = $this->learnerSession('C');
        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-3/start')
            ->json();
        Http::fake([
            '*/mu/transcribe' => Http::sequence()
                ->push($this->muEvidence('different phrase'))
                ->push($this->muEvidence('still different'))
                ->push($this->muEvidence('echo still different')),
        ]);
        $submitUrl = "/api/learners/lessons/lesson-3/{$state['run_id']}/submit";
        $supportUrl = "/api/learners/lessons/lesson-3/{$state['run_id']}/continue-support";

        $first = $this->submitAudio(
            $token,
            $submitUrl,
            $state['item']['item_key'],
            'first.webm',
        )->assertOk()->json();
        $this->assertSame(1, $first['practice_tries']['count']);
        $this->withToken($token)
            ->postJson($supportUrl, ['item_key' => $state['item']['item_key']])
            ->assertOk()
            ->assertJsonPath('teaching.state', 'GUIDED_RETRY');

        $demonstrating = $this->submitAudio(
            $token,
            $submitUrl,
            $state['item']['item_key'],
            'second.webm',
        )
            ->assertOk()
            ->assertJsonPath('teaching.state', 'DEMONSTRATING')
            ->assertJsonPath('support.speech.0.kind', 'published')
            ->assertJsonPath(
                'support.speech.0.speech_key',
                str_replace(
                    'lesson-v1-phrase-',
                    'lesson-3-demo-',
                    $state['item']['item_key'],
                ),
            )
            ->json();

        $this->assertSame('GIVING_CLUE', $first['teaching']['state']);
        $this->assertSame(2, $demonstrating['practice_tries']['count']);

        $this->withToken($token)
            ->postJson($supportUrl, ['item_key' => $state['item']['item_key']])
            ->assertOk()
            ->assertJsonPath('teaching.state', 'ECHO_RETRY');

        $this->submitAudio(
            $token,
            $submitUrl,
            $state['item']['item_key'],
            'echo.webm',
        )
            ->assertOk()
            ->assertJsonPath('response.outcome', 'NOT_YET_CORRECT')
            ->assertJsonPath('practice_tries.count', 2);
    }

    public function test_five_skips_complete_lesson_three_and_unlock_lesson_four(): void
    {
        [$token, $learner] = $this->learnerSession('D');
        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-3/start')
            ->json();

        for ($item = 1; $item <= 5; $item++) {
            $state = $this->withToken($token)->postJson(
                "/api/learners/lessons/lesson-3/{$state['run_id']}/skip",
                ['item_key' => $state['item']['item_key']],
            )->assertOk()->json();
        }

        $this->assertSame('completed', $state['status']);
        $this->assertSame('Lesson 3 complete.', $state['completion']['title']);
        $this->assertSame(5, $state['completion']['maximum']);
        $this->assertCount(1, $state['completion']['segments']);
        $this->assertSame(
            4,
            $learner->progressState()->firstOrFail()->current_required_lesson_order,
        );
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.phrase_pro',
        ]);
    }

    /** @return array<string, mixed> */
    private function muEvidence(string $transcript): array
    {
        return [
            'raw_transcript' => $transcript,
            'basic_normalized_transcript' => $transcript,
            'audio_quality' => ['usable' => true, 'warnings' => []],
            'noise_reduction' => ['requires_retry' => false],
        ];
    }

    private function submitAudio(
        string $token,
        string $url,
        string $itemKey,
        string $filename,
    ) {
        return $this->withToken($token)->post($url, [
            'item_key' => $itemKey,
            'audio' => UploadedFile::fake()->create(
                $filename,
                12,
                'audio/webm',
            ),
        ]);
    }

    /** @return array{string, Learner} */
    private function learnerSession(string $suffix): array
    {
        $learner = Learner::query()->create([
            'learner_code' => "L3{$suffix}01",
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 3,
        ]);
        $token = "lesson-three-token-{$suffix}";
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [$token, $learner];
    }
}
