<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerSession;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerAssessmentPartOneTest extends TestCase
{
    public function test_part_one_starts_with_a_private_fixed_orientation_state(): void
    {
        $token = $this->createLearnerSession();

        $response = $this->withToken($token)
            ->post('/api/learners/assessments/part-one/start')
            ->assertOk()
            ->assertJsonPath('stage', 'orientation')
            ->assertJsonPath('orientation_ready', false)
            ->assertJsonPath('item', null)
            ->assertJsonMissing(['correct_response' => 'yes']);

        $runId = $response->json('run_id');
        $this->withToken($token)
            ->post('/api/learners/assessments/part-one/start')
            ->assertJsonPath('run_id', $runId);

        $this->assertDatabaseCount('assessment_runs', 1);
    }

    public function test_orientation_and_letter_submission_use_asr_and_advance_without_revealing_correctness(): void
    {
        Http::fake([
            'http://127.0.0.1:8001/mu/transcribe' => Http::response([
                'raw_transcript' => 'ready',
                'audio_quality' => ['usable' => true],
            ]),
            'http://127.0.0.1:8001/mu/resolve-letter' => Http::response([
                'raw_transcript' => 'ay',
                'predicted_class' => 'A',
                'decision' => 'CORRECT',
                'audio_quality' => ['usable' => true],
            ]),
        ]);
        $token = $this->createLearnerSession();
        $runId = $this->withToken($token)
            ->post('/api/learners/assessments/part-one/start')
            ->json('run_id');

        $letter = $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$runId}/orientation", [
                'audio' => UploadedFile::fake()->create('ready.webm', 12, 'audio/webm'),
            ])
            ->assertOk()
            ->assertJsonPath('stage', 'task-1a')
            ->assertJsonPath('orientation_ready', true)
            ->assertJsonPath('item.display_text', 'A a')
            ->json('item');

        $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$runId}/speech", [
                'item_key' => $letter['item_key'],
                'audio' => UploadedFile::fake()->create('letter.webm', 12, 'audio/webm'),
            ])
            ->assertOk()
            ->assertJsonPath('response_committed', false)
            ->assertJsonPath('progress.current', 2)
            ->assertJsonPath('progress.completed', 1)
            ->assertJsonPath('item.display_text', 'C c')
            ->assertJsonMissing(['decision' => 'CORRECT'])
            ->assertJsonMissing(['score' => 1]);

        $this->assertDatabaseHas('assessment_responses', [
            'assessment_run_id' => $runId,
            'task_key' => 'task-1a',
            'decision' => 'CORRECT',
            'score' => 1,
        ]);
        Http::assertSent(fn ($request): bool => $request->hasHeader(
            'Authorization',
            'Bearer '.config('speech.asr_token'),
        ));
    }

    public function test_resume_advances_past_a_legacy_committed_item(): void
    {
        [$token, $run] = $this->createRunAtTask('task-1a');
        $item = $run->content_snapshot['task-1a'][0];
        AssessmentResponse::query()->create([
            'assessment_run_id' => $run->id,
            'task_key' => 'task-1a',
            'item_key' => $item['item_key'],
            'item_order' => (int) $item['sort_order'],
            'response_type' => 'speech',
            'decision' => 'CORRECT',
            'score' => 1,
        ]);

        $this->withToken($token)
            ->post('/api/learners/assessments/part-one/start')
            ->assertOk()
            ->assertJsonPath('stage', 'task-1a')
            ->assertJsonPath('progress.current', 2)
            ->assertJsonPath('response_committed', false)
            ->assertJsonPath('item.display_text', 'C c');
    }

    public function test_skipping_commits_a_distinct_zero_score_and_advances_automatically(): void
    {
        [$token, $run] = $this->createRunAtTask('task-1a');
        $item = $run->content_snapshot['task-1a'][0];

        $this->withToken($token)
            ->postJson("/api/learners/assessments/part-one/{$run->id}/skip", [
                'item_key' => $item['item_key'],
            ])
            ->assertOk()
            ->assertJsonPath('response_committed', false)
            ->assertJsonPath('progress.current', 2)
            ->assertJsonPath('progress.completed', 1)
            ->assertJsonMissing(['decision' => 'SKIPPED'])
            ->assertJsonMissing(['score' => 0]);

        $this->assertDatabaseHas('assessment_responses', [
            'assessment_run_id' => $run->id,
            'task_key' => 'task-1a',
            'item_key' => $item['item_key'],
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'score' => 0,
        ]);

        $this->assertSame(1, $run->fresh()->current_item_index);
    }

    public function test_rhyme_submission_commits_and_advances_without_a_separate_next_action(): void
    {
        [$token, $run] = $this->createRunAtTask('task-2a');
        $item = $run->content_snapshot['task-2a'][0];

        $this->withToken($token)
            ->postJson("/api/learners/assessments/part-one/{$run->id}/rhyme", [
                'item_key' => $item['item_key'],
                'choice' => $item['correct_response'],
            ])
            ->assertOk()
            ->assertJsonPath('stage', 'task-2a')
            ->assertJsonPath('progress.current', 2)
            ->assertJsonPath('progress.completed', 1)
            ->assertJsonPath('response_committed', false)
            ->assertJsonMissing(['decision' => 'CORRECT'])
            ->assertJsonMissing(['score' => 1]);

        $this->assertDatabaseHas('assessment_responses', [
            'assessment_run_id' => $run->id,
            'task_key' => 'task-2a',
            'item_key' => $item['item_key'],
            'response_type' => 'choice',
            'decision' => 'CORRECT',
            'score' => 1,
        ]);
        $this->assertSame(1, $run->fresh()->current_item_index);
    }

    public function test_low_branch_administers_rhymes_and_finishes_with_task_two_b_not_administered(): void
    {
        [$token, $run] = $this->createRunAtTask('task-1a');
        $this->seedTaskResponses($run, 'task-1a', 6);
        $run->forceFill(['current_item_index' => 9])->save();

        $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$run->id}/advance")
            ->assertOk()
            ->assertJsonPath('stage', 'task-2a')
            ->assertJsonPath('item.word_one', 'cat')
            ->assertJsonMissing(['correct_response' => 'yes']);

        $run->refresh();
        $this->seedTaskResponses($run, 'task-2a', 8);
        $run->forceFill(['current_item_index' => 9])->save();

        $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$run->id}/advance")
            ->assertOk()
            ->assertJsonPath('stage', 'part-1-results')
            ->assertJsonPath('result.score', 14)
            ->assertJsonPath('result.level', 'Moderate Refresher')
            ->assertJsonPath('result.segments.2.status', 'not_administered')
            ->assertJsonPath('result.continues_to_part_two', false);
    }

    public function test_high_branch_auto_scores_rhymes_and_administers_words(): void
    {
        [$token, $run] = $this->createRunAtTask('task-1a');
        $this->seedTaskResponses($run, 'task-1a', 7);
        $run->forceFill(['current_item_index' => 9])->save();

        $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$run->id}/advance")
            ->assertOk()
            ->assertJsonPath('stage', 'task-2b')
            ->assertJsonPath('item.display_text', 'bag');

        $run->refresh();
        $this->seedTaskResponses($run, 'task-2b', 8);
        $run->forceFill(['current_item_index' => 9])->save();

        $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$run->id}/advance")
            ->assertOk()
            ->assertJsonPath('result.score', 25)
            ->assertJsonPath('result.level', 'Light Refresher')
            ->assertJsonPath('result.segments.1.status', 'automatic')
            ->assertJsonPath('result.continues_to_part_two', true);
    }

    public function test_low_part_one_result_skips_part_two_and_opens_completion(): void
    {
        [$token, $run] = $this->createRunAtTask('part-1-results');
        $run->forceFill([
            'part_one_branch' => 'low',
            'task_1a_score' => 6,
            'task_2a_score' => 8,
            'task_2b_score' => 0,
            'part_one_score' => 14,
            'part_one_level' => 'Moderate Refresher',
            'part_one_completed_at' => now(),
        ])->save();

        $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$run->id}/continue")
            ->assertOk()
            ->assertJsonPath('next_route', '/learner/assessment/complete');

        $run->refresh();
        $this->assertSame('assessment-complete', $run->stage);
        $this->assertSame(AssessmentRun::STATUS_COMPLETED, $run->status);
        $this->assertSame(0, $run->final_reading_score);
        $this->assertSame('Low Emerging Reader', $run->final_reading_profile);
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $run->learner_id,
            'achievement_key' => 'reading.ready_reader',
        ]);

        $this->withToken($token)
            ->get('/api/learners/assessments/part-two/current')
            ->assertOk()
            ->assertJsonPath('stage', 'assessment-complete')
            ->assertJsonPath(
                'completion.achievement_keys.0',
                'reading.ready_reader',
            );
    }

    /** @return array{string, AssessmentRun} */
    private function createRunAtTask(string $stage): array
    {
        $token = $this->createLearnerSession();
        $runId = $this->withToken($token)
            ->post('/api/learners/assessments/part-one/start')
            ->json('run_id');
        $run = AssessmentRun::query()->findOrFail($runId);
        $run->forceFill([
            'stage' => $stage,
            'orientation_completed_at' => now(),
            'current_item_index' => 0,
        ])->save();

        return [$token, $run];
    }

    private function seedTaskResponses(AssessmentRun $run, string $taskKey, int $score): void
    {
        $items = $run->content_snapshot[$taskKey];
        foreach ($items as $index => $item) {
            AssessmentResponse::query()->create([
                'assessment_run_id' => $run->id,
                'task_key' => $taskKey,
                'item_key' => $item['item_key'],
                'item_order' => $index + 1,
                'response_type' => $taskKey === 'task-2a' ? 'choice' : 'speech',
                'decision' => $index < $score ? 'CORRECT' : 'INCORRECT',
                'score' => $index < $score ? 1 : 0,
            ]);
        }
    }

    private function createLearnerSession(): string
    {
        $learner = Learner::query()->create([
            'learner_code' => 'AB123',
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        $token = 'part-one-learner-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return $token;
    }
}
