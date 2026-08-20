<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerLessonOneTest extends TestCase
{
    public function test_start_locks_fifteen_unique_targets_and_resumes_the_same_run(): void
    {
        [$token] = $this->learnerSession();
        $response = $this->withToken($token)->post('/api/learners/lessons/lesson-1/start')
            ->assertOk()
            ->assertJsonPath('mission.key', 'mission-1')
            ->assertJsonPath('progress.current', 1)
            ->assertJsonPath('support.display_mode', 'instruction')
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-1-mission-1')
            ->assertJsonPath('support.after_speech', 'record');
        $run = LessonRun::query()->findOrFail($response->json('run_id'));
        $targets = collect($run->content_snapshot)->flatten(1)->pluck('target_key');

        $this->assertCount(15, $targets);
        $this->assertCount(15, $targets->unique());
        $this->assertTrue(collect($run->content_snapshot['mission-2'])->every(fn (array $row): bool => $row['eligible_mission_2'] === 'true'));
        $this->assertTrue(collect($run->content_snapshot['mission-3'])->every(fn (array $row): bool => $row['eligible_mission_3'] === 'true'));
        $this->assertDatabaseCount('lesson_target_exposures', 15);
        $this->withToken($token)->post('/api/learners/lessons/lesson-1/start')->assertJsonPath('run_id', $run->id);
        $this->assertDatabaseCount('lesson_runs', 1);
    }

    public function test_speech_submission_commits_feedback_but_waits_for_next(): void
    {
        Http::fake(['*/mu/resolve-letter' => Http::response([
            'raw_transcript' => 'kei', 'predicted_class' => 'K', 'decision' => 'CORRECT',
        ])]);
        [$token] = $this->learnerSession();
        $start = $this->withToken($token)->post('/api/learners/lessons/lesson-1/start')->json();

        $this->withToken($token)->post("/api/learners/lessons/lesson-1/{$start['run_id']}/submit", [
            'item_key' => $start['item']['item_key'],
            'audio' => UploadedFile::fake()->create('letter.webm', 12, 'audio/webm'),
        ])->assertOk()
            ->assertJsonPath('progress.current', 1)
            ->assertJsonPath('response.final_transcript', 'K')
            ->assertJsonPath('response.decision', 'CORRECT')
            ->assertJsonPath('response.outcome', 'INDEPENDENT_CORRECT')
            ->assertJsonPath('response.academic_attempt_count', 1)
            ->assertJsonPath('response.independent_mastery', true)
            ->assertJsonPath('teaching.can_advance', true)
            ->assertJsonPath('support.speech.0.kind', 'published')
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-1-feedback-independent')
            ->assertJsonPath('support.after_speech', 'advance');

        $this->assertDatabaseHas('lesson_item_attempts', [
            'lesson_response_id' => LessonResponse::query()->value('id'),
            'attempt_sequence' => 1,
            'attempt_kind' => 'independent',
            'academic_attempt_number' => 1,
            'audio_classification' => 'CLEAR_CORRECT',
            'audio_path' => null,
            'audio_sha256' => null,
        ]);
        $this->assertDatabaseHas('lesson_responses', [
            'id' => LessonResponse::query()->value('id'),
            'audio_path' => null,
            'audio_sha256' => null,
        ]);

        $this->withToken($token)->post("/api/learners/lessons/lesson-1/{$start['run_id']}/advance")
            ->assertOk()
            ->assertJsonPath('progress.current', 2)
            ->assertJsonPath('response', null)
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-1-mission-1-item-2');
    }

    public function test_clear_incorrect_attempts_persist_the_bounded_clue_demonstration_and_echo_path(): void
    {
        Http::fake([
            '*/mu/resolve-letter' => Http::sequence()
                ->push(['raw_transcript' => 'tee', 'predicted_class' => 'T', 'decision' => 'UNKNOWN'])
                ->push(['raw_transcript' => 'dee', 'predicted_class' => 'D', 'decision' => 'UNKNOWN'])
                ->push(['raw_transcript' => 'kei', 'predicted_class' => 'K', 'decision' => 'CORRECT']),
        ]);
        [$token] = $this->learnerSession();
        $start = $this->withToken($token)->post('/api/learners/lessons/lesson-1/start')->json();
        $submitUrl = "/api/learners/lessons/lesson-1/{$start['run_id']}/submit";
        $supportUrl = "/api/learners/lessons/lesson-1/{$start['run_id']}/continue-support";
        $itemKey = $start['item']['item_key'];

        $this->withToken($token)->post($submitUrl, [
            'item_key' => $itemKey,
            'audio' => UploadedFile::fake()->create('attempt-1.webm', 12, 'audio/webm'),
        ])->assertOk()
            ->assertJsonPath('teaching.state', 'GIVING_CLUE')
            ->assertJsonPath('teaching.academic_attempt_count', 1)
            ->assertJsonPath('teaching.can_continue_support', true)
            ->assertJsonPath('teaching.can_advance', false)
            ->assertJsonPath('support.display_mode', 'clue')
            ->assertJsonPath('support.speech.0.kind', 'runtime_feedback')
            ->assertJsonPath('support.speech.1.speech_key', 'lesson-1-clue-mission-1')
            ->assertJsonPath('support.after_speech', 'continue_support');

        $this->withToken($token)
            ->get("/api/learners/lessons/lesson-1/{$start['run_id']}")
            ->assertOk()
            ->assertJsonPath('teaching.state', 'GIVING_CLUE')
            ->assertJsonPath('teaching.academic_attempt_count', 1)
            ->assertJsonPath('response.attempt_count', 1);

        $this->withToken($token)
            ->post("/api/learners/lessons/lesson-1/{$start['run_id']}/advance")
            ->assertStatus(409);

        $this->withToken($token)->postJson($supportUrl, ['item_key' => $itemKey])
            ->assertOk()
            ->assertJsonPath('teaching.state', 'GUIDED_RETRY')
            ->assertJsonPath('teaching.highest_scaffold_used', 'targeted_clue')
            ->assertJsonPath('teaching.can_record', true)
            ->assertJsonCount(0, 'support.speech')
            ->assertJsonPath('support.after_speech', 'record');

        $this->withToken($token)->post($submitUrl, [
            'item_key' => $itemKey,
            'audio' => UploadedFile::fake()->create('attempt-2.webm', 12, 'audio/webm'),
        ])->assertOk()
            ->assertJsonPath('teaching.state', 'DEMONSTRATING')
            ->assertJsonPath('teaching.academic_attempt_count', 2)
            ->assertJsonPath('support.display_mode', 'demonstration')
            ->assertJsonPath('support.after_speech', 'continue_support')
            ->assertJsonPath('support.speech.0.kind', 'published');

        $this->withToken($token)->postJson($supportUrl, ['item_key' => $itemKey])
            ->assertOk()
            ->assertJsonPath('teaching.state', 'ECHO_RETRY')
            ->assertJsonPath('teaching.highest_scaffold_used', 'demonstration');

        $this->withToken($token)->post($submitUrl, [
            'item_key' => $itemKey,
            'audio' => UploadedFile::fake()->create('echo.webm', 12, 'audio/webm'),
        ])->assertOk()
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

    public function test_unusable_audio_is_technical_and_never_counts_as_an_academic_attempt(): void
    {
        Http::fake([
            '*/mu/resolve-letter' => Http::sequence()
                ->push([
                    'raw_transcript' => '',
                    'predicted_class' => 'UNKNOWN',
                    'decision' => 'UNKNOWN',
                    'audio_quality' => ['usable' => false, 'reason' => 'too much silence'],
                ])
                ->push([
                    'raw_transcript' => '',
                    'predicted_class' => 'UNKNOWN',
                    'decision' => 'UNKNOWN',
                    'audio_quality' => ['usable' => false, 'reason' => 'too much silence'],
                ]),
        ]);
        [$token] = $this->learnerSession();
        $start = $this->withToken($token)->post('/api/learners/lessons/lesson-1/start')->json();
        $url = "/api/learners/lessons/lesson-1/{$start['run_id']}/submit";

        foreach ([1, 2] as $attempt) {
            $response = $this->withToken($token)->post($url, [
                'item_key' => $start['item']['item_key'],
                'audio' => UploadedFile::fake()->create("technical-{$attempt}.webm", 12, 'audio/webm'),
            ])->assertOk();
        }

        $response
            ->assertJsonPath('response.outcome', 'UNSCORABLE_AUDIO')
            ->assertJsonPath('response.academic_attempt_count', 0)
            ->assertJsonPath('response.technical_retry_count', 2)
            ->assertJsonPath('response.independent_mastery', false)
            ->assertJsonPath('teaching.can_advance', true)
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-1-feedback-unscorable');
        $this->assertDatabaseCount('lesson_item_attempts', 2);
        $this->assertSame(
            0,
            LessonResponse::query()->firstOrFail()->attempts()
                ->whereNotNull('academic_attempt_number')
                ->count(),
        );
    }

    public function test_skip_is_distinct_and_advances_immediately(): void
    {
        [$token] = $this->learnerSession();
        $start = $this->withToken($token)->post('/api/learners/lessons/lesson-1/start')->json();
        $this->withToken($token)->postJson("/api/learners/lessons/lesson-1/{$start['run_id']}/skip", [
            'item_key' => $start['item']['item_key'],
        ])->assertOk()->assertJsonPath('progress.current', 2);
        $this->assertDatabaseHas('lesson_responses', [
            'lesson_run_id' => $start['run_id'],
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'outcome' => 'SKIPPED',
            'academic_attempt_count' => 0,
        ]);
        $this->assertDatabaseHas('lesson_item_attempts', [
            'attempt_kind' => 'skip',
            'audio_classification' => 'SKIPPED',
        ]);
    }

    public function test_runtime_letter_feedback_uses_pronunciation_map_without_changing_saved_letter(): void
    {
        Http::fake(['*/synthesize' => Http::response('wave-bytes', 200, ['Content-Type' => 'audio/wav'])]);
        [$token, $learner] = $this->learnerSession();
        $run = LessonRun::query()->create([
            'learner_id' => $learner->id, 'lesson_key' => 'required-lesson-1', 'content_version' => 'v1',
            'status' => 'active', 'mission_key' => 'mission-1', 'current_item_index' => 0, 'content_snapshot' => ['mission-1' => []],
        ]);
        $response = LessonResponse::query()->create([
            'lesson_run_id' => $run->id, 'mission_key' => 'mission-1', 'item_key' => 'letter-k',
            'item_order' => 1, 'response_type' => 'speech', 'raw_transcript' => 'kay',
            'final_transcript' => 'K', 'decision' => 'NEEDS_SUPPORT',
            'teaching_state' => 'GIVING_CLUE',
            'academic_attempt_count' => 1,
        ]);

        $this->withToken($token)->post("/api/learners/tts/lesson-feedback/{$response->id}")
            ->assertOk()->assertHeader('X-ReaDirect-Letter', 'K');
        Http::assertSent(fn ($request): bool => $request['text'] === 'You said kei.' && $request['reference'] === 'result');
        $this->assertSame('K', $response->fresh()->final_transcript);
    }

    public function test_completed_lesson_returns_real_scores_for_the_shared_result_design(): void
    {
        [$token, $learner] = $this->learnerSession();
        $run = LessonRun::query()->create([
            'learner_id' => $learner->id, 'lesson_key' => 'required-lesson-1', 'content_version' => 'v1',
            'status' => 'completed', 'mission_key' => 'mission-3', 'current_item_index' => 4, 'content_snapshot' => [],
        ]);
        $decisions = [
            'mission-1' => ['CORRECT', 'CORRECT', 'CORRECT', 'CORRECT', 'CORRECT'],
            'mission-2' => ['CORRECT', 'CORRECT', 'CORRECT', 'CORRECT', 'SKIPPED'],
            'mission-3' => ['CORRECT', 'CORRECT', 'CORRECT', 'NEEDS_SUPPORT', 'NEEDS_SUPPORT'],
        ];

        foreach ($decisions as $missionKey => $missionDecisions) {
            foreach ($missionDecisions as $index => $decision) {
                LessonResponse::query()->create([
                    'lesson_run_id' => $run->id,
                    'mission_key' => $missionKey,
                    'item_key' => "{$missionKey}-{$index}",
                    'item_order' => $index + 1,
                    'response_type' => $decision === 'SKIPPED' ? 'skipped' : 'speech',
                    'decision' => $decision,
                ]);
            }
        }

        $this->withToken($token)->get("/api/learners/lessons/lesson-1/{$run->id}")
            ->assertOk()
            ->assertJsonPath('completion.score', 12)
            ->assertJsonPath('completion.maximum', 15)
            ->assertJsonPath('completion.segments.0.score', 5)
            ->assertJsonPath('completion.segments.1.score', 4)
            ->assertJsonPath('completion.segments.2.score', 3);
    }

    /** @return array{string, Learner} */
    private function learnerSession(): array
    {
        $learner = Learner::query()->create([
            'learner_code' => 'LM123', 'password' => 'local-password', 'first_name' => 'Lena',
            'middle_name' => '', 'last_name' => 'Reader', 'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id, 'stage' => 'required_lessons', 'current_required_lesson_order' => 1,
        ]);
        $token = 'lesson-one-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id, 'token_hash' => hash('sha256', $token),
            'session_type' => 'standard', 'last_seen_at' => now(), 'expires_at' => now()->addHour(),
        ]);

        return [$token, $learner];
    }
}
