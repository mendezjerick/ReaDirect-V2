<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerLessonTwoTeachingTest extends TestCase
{
    public function test_mu_word_submission_persists_raw_and_resolved_evidence_before_advance(): void
    {
        [$token] = $this->learnerSession('A');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
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
                "/api/learners/lessons/lesson-2/{$start['run_id']}/submit",
                [
                    'item_key' => $start['item']['item_key'],
                    'audio' => UploadedFile::fake()->create(
                        'word.webm',
                        12,
                        'audio/webm',
                    ),
                ],
            )
            ->assertOk()
            ->assertJsonPath('progress.current', 1)
            ->assertJsonPath('response.final_transcript', $expected)
            ->assertJsonPath('response.decision', 'CORRECT')
            ->assertJsonPath('response.outcome', 'INDEPENDENT_CORRECT')
            ->assertJsonPath('response.independent_mastery', true)
            ->assertJsonPath('teaching.can_advance', true)
            ->assertJsonPath('support.speech.0.kind', 'runtime_feedback')
            ->assertJsonPath(
                'support.speech.1.speech_key',
                'lesson-2-feedback-independent',
            )
            ->assertJsonPath('support.after_speech', 'advance');

        $response = LessonResponse::query()->firstOrFail();
        $this->assertSame(strtoupper($expected).'.', $response->raw_transcript);
        $this->assertSame($expected, $response->final_transcript);
        $this->assertTrue(
            $response->evidence['equivalence_resolution']['accepted_match'],
        );
        $this->assertDatabaseHas('lesson_item_attempts', [
            'lesson_response_id' => $response->id,
            'attempt_sequence' => 1,
            'attempt_kind' => 'independent',
            'academic_attempt_number' => 1,
            'audio_classification' => 'CLEAR_CORRECT',
        ]);
        Http::assertSent(
            fn ($request): bool => str_ends_with(
                $request->url(),
                '/mu/transcribe',
            )
                && str_contains($request->body(), 'name="task_type"')
                && str_contains($request->body(), "\r\n\r\nword\r\n"),
        );

        $this->withToken($token)
            ->post("/api/learners/lessons/lesson-2/{$start['run_id']}/advance")
            ->assertOk()
            ->assertJsonPath('progress.current', 2)
            ->assertJsonPath('response', null);
    }

    public function test_two_incorrect_words_follow_clue_demonstration_and_echo_support(): void
    {
        [$token] = $this->learnerSession('B');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->json();
        $submitUrl = "/api/learners/lessons/lesson-2/{$start['run_id']}/submit";
        $supportUrl = "/api/learners/lessons/lesson-2/{$start['run_id']}/continue-support";
        $itemKey = $start['item']['item_key'];
        $expected = $start['item']['display_text'];
        Http::fake([
            '*/mu/transcribe' => Http::sequence()
                ->push($this->muEvidence('different'))
                ->push($this->muEvidence('still different'))
                ->push($this->muEvidence($expected)),
        ]);

        $this->submitAudio($token, $submitUrl, $itemKey, 'attempt-1.webm')
            ->assertOk()
            ->assertJsonPath('teaching.state', 'GIVING_CLUE')
            ->assertJsonPath('teaching.academic_attempt_count', 1)
            ->assertJsonPath('teaching.can_continue_support', true)
            ->assertJsonPath('support.speech.0.kind', 'runtime_feedback')
            ->assertJsonPath(
                'support.speech.1.speech_key',
                'lesson-2-clue-mission-1',
            );

        $this->withToken($token)
            ->postJson($supportUrl, ['item_key' => $itemKey])
            ->assertOk()
            ->assertJsonPath('teaching.state', 'GUIDED_RETRY')
            ->assertJsonPath('teaching.highest_scaffold_used', 'targeted_clue')
            ->assertJsonPath('teaching.can_record', true);

        $this->submitAudio($token, $submitUrl, $itemKey, 'attempt-2.webm')
            ->assertOk()
            ->assertJsonPath('teaching.state', 'DEMONSTRATING')
            ->assertJsonPath('teaching.academic_attempt_count', 2)
            ->assertJsonPath('teaching.can_continue_support', true)
            ->assertJsonPath(
                'support.speech.0.kind',
                'runtime_demonstration',
            );

        $this->withToken($token)
            ->postJson($supportUrl, ['item_key' => $itemKey])
            ->assertOk()
            ->assertJsonPath('teaching.state', 'ECHO_RETRY')
            ->assertJsonPath('teaching.highest_scaffold_used', 'demonstration');

        $this->submitAudio($token, $submitUrl, $itemKey, 'echo.webm')
            ->assertOk()
            ->assertJsonPath('response.outcome', 'DEMONSTRATED')
            ->assertJsonPath('response.academic_attempt_count', 2)
            ->assertJsonPath('response.independent_mastery', false)
            ->assertJsonPath('response.attempt_count', 3)
            ->assertJsonPath('teaching.can_advance', true);

        $this->assertDatabaseHas('lesson_item_attempts', [
            'attempt_sequence' => 2,
            'attempt_kind' => 'guided',
            'academic_attempt_number' => 2,
        ]);
        $this->assertDatabaseHas('lesson_item_attempts', [
            'attempt_sequence' => 3,
            'attempt_kind' => 'echo',
            'academic_attempt_number' => null,
        ]);
    }

    public function test_silent_audio_is_technical_and_does_not_consume_academic_attempts(): void
    {
        [$token] = $this->learnerSession('C');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->json();
        Http::fake([
            '*/mu/transcribe' => Http::sequence()
                ->push($this->muEvidence('', false, ['mostly_silent']))
                ->push($this->muEvidence('', false, ['mostly_silent'])),
        ]);
        $url = "/api/learners/lessons/lesson-2/{$start['run_id']}/submit";

        foreach ([1, 2] as $attempt) {
            $response = $this->submitAudio(
                $token,
                $url,
                $start['item']['item_key'],
                "technical-{$attempt}.webm",
            )->assertOk();
        }

        $response
            ->assertJsonPath('response.outcome', 'UNSCORABLE_AUDIO')
            ->assertJsonPath('response.academic_attempt_count', 0)
            ->assertJsonPath('response.technical_retry_count', 2)
            ->assertJsonPath('teaching.can_advance', true);
        $this->assertDatabaseCount('lesson_item_attempts', 2);
        $this->assertSame(
            0,
            LessonResponse::query()
                ->firstOrFail()
                ->attempts()
                ->whereNotNull('academic_attempt_number')
                ->count(),
        );
    }

    public function test_skip_advances_immediately_and_completion_unlocks_lesson_three(): void
    {
        [$token, $learner] = $this->learnerSession('D');
        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->json();

        for ($item = 1; $item <= 10; $item++) {
            $response = $this->withToken($token)->postJson(
                "/api/learners/lessons/lesson-2/{$state['run_id']}/skip",
                ['item_key' => $state['item']['item_key']],
            )->assertOk();
            $state = $response->json();

            if ($item === 5) {
                $response
                    ->assertJsonPath('mission.key', 'mission-2')
                    ->assertJsonPath('mission.number', 2)
                    ->assertJsonPath('progress.current', 1)
                    ->assertJsonPath(
                        'item.presentation',
                        'highlighted_sentence_word',
                    );
            }
        }

        $this->assertSame('completed', $state['status']);
        $this->assertNull($state['item']);
        $this->assertSame('Lesson 2 complete!', $state['completion']['title']);
        $this->assertSame(0, $state['completion']['score']);
        $this->assertSame(10, $state['completion']['maximum']);
        $this->assertSame(
            3,
            $learner->progressState()->firstOrFail()->current_required_lesson_order,
        );
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.word_wizard',
        ]);
        $this->assertDatabaseCount('lesson_responses', 10);
        $this->assertDatabaseCount('lesson_item_attempts', 10);

        $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->assertOk()
            ->assertJsonPath('run_id', $state['run_id'])
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-2-complete');
    }

    public function test_runtime_feedback_speaks_the_final_resolved_word(): void
    {
        [$token] = $this->learnerSession('E');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->json();
        $response = LessonResponse::query()->create([
            'lesson_run_id' => $start['run_id'],
            'mission_key' => 'mission-1',
            'item_key' => $start['item']['item_key'],
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'cap',
            'final_transcript' => 'cat',
            'decision' => 'CORRECT',
            'teaching_state' => 'INDEPENDENT_FEEDBACK',
            'outcome' => 'INDEPENDENT_CORRECT',
            'academic_attempt_count' => 1,
            'independent_mastery' => true,
        ]);
        Http::fake([
            '*/synthesize' => Http::response(
                'wave-bytes',
                200,
                ['Content-Type' => 'audio/wav'],
            ),
        ]);

        $this->withToken($token)
            ->post("/api/learners/tts/lesson-feedback/{$response->id}")
            ->assertOk()
            ->assertHeader('X-ReaDirect-Word', 'cat');

        Http::assertSent(
            fn ($request): bool => $request['text'] === 'You said cat.'
                && $request['reference'] === 'result',
        );
    }

    public function test_runtime_demonstration_uses_the_hidden_snapshot_target(): void
    {
        [$token] = $this->learnerSession('F');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->json();
        $response = LessonResponse::query()->create([
            'lesson_run_id' => $start['run_id'],
            'mission_key' => 'mission-1',
            'item_key' => $start['item']['item_key'],
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'different',
            'final_transcript' => 'different',
            'decision' => 'NEEDS_SUPPORT',
            'teaching_state' => 'DEMONSTRATING',
            'academic_attempt_count' => 2,
        ]);
        Http::fake([
            '*/synthesize' => Http::response(
                'wave-bytes',
                200,
                ['Content-Type' => 'audio/wav'],
            ),
        ]);
        $word = $start['item']['display_text'];

        $this->withToken($token)
            ->post("/api/learners/tts/lesson-demonstration/{$response->id}")
            ->assertOk()
            ->assertHeader('X-ReaDirect-Word', $word);

        Http::assertSent(
            fn ($request): bool => $request['text']
                === "The word is {$word}. Listen: {$word}. Now you try."
                && $request['reference'] === 'instruction',
        );
    }

    /**
     * @param  list<string>  $warnings
     * @return array<string, mixed>
     */
    private function muEvidence(
        string $transcript,
        bool $usable = true,
        array $warnings = [],
    ): array {
        return [
            'raw_transcript' => $transcript,
            'basic_normalized_transcript' => $transcript,
            'audio_quality' => [
                'usable' => $usable,
                'warnings' => $warnings,
            ],
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
            'learner_code' => "L2T{$suffix}1",
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 2,
        ]);
        $token = "lesson-two-teaching-token-{$suffix}";
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
