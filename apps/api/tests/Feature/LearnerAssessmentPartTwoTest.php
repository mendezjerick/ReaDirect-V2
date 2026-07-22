<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Services\AssessmentContentCatalog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerAssessmentPartTwoTest extends TestCase
{
    public function test_high_part_one_result_continues_to_immutable_story_selection(): void
    {
        [$token, $run] = $this->createRun('part-1-results');

        $this->withToken($token)
            ->post("/api/learners/assessments/part-one/{$run->id}/continue")
            ->assertOk()
            ->assertJsonPath('next_route', '/learner/assessment/part-two');

        $state = $this->withToken($token)
            ->get('/api/learners/assessments/part-two/current')
            ->assertOk()
            ->assertJsonPath('stage', 'story-selection')
            ->assertJsonCount(2, 'story_choices')
            ->assertJsonPath('story_choices.0.title', 'Lena at the Park')
            ->assertJsonMissing(['who_fact' => 'Lena']);

        $storyKey = $state->json('story_choices.0.story_key');
        $this->withToken($token)
            ->postJson("/api/learners/assessments/part-two/{$run->id}/story", [
                'story_key' => $storyKey,
            ])
            ->assertOk()
            ->assertJsonPath('stage', 'task-3a')
            ->assertJsonPath('item.title', 'Lena at the Park')
            ->assertJsonPath('item.time_limit_seconds', 60)
            ->assertJsonMissing(['spoken_target' => 'lena goes']);

        $this->assertSame($storyKey, $run->fresh()->selected_story_key);
    }

    public function test_passage_submission_commits_accuracy_and_opens_linked_questions(): void
    {
        [$token, $run] = $this->createRun('task-3a', [
            'selected_story_key' => 'story:lena-at-park',
            'story_selected_at' => now(),
        ]);
        $passage = collect($run->content_snapshot['task-3a'])
            ->firstWhere('story_key', 'story:lena-at-park');
        Http::fake([
            'http://127.0.0.1:8001/mu/transcribe' => Http::response([
                'raw_transcript' => $passage['spoken_target'],
                'audio_quality' => ['usable' => true],
                'comparison' => ['exact_match' => true],
            ]),
        ]);

        $this->withToken($token)
            ->post("/api/learners/assessments/part-two/{$run->id}/passage", [
                'item_key' => $passage['item_key'],
                'audio' => UploadedFile::fake()->create('passage.webm', 120, 'audio/webm'),
            ])
            ->assertOk()
            ->assertJsonPath('stage', 'task-3b')
            ->assertJsonPath('progress.current', 1)
            ->assertJsonPath('item.question_type', 'who')
            ->assertJsonPath('item.question_text', 'Who goes to the park?')
            ->assertJsonMissing(['correct_choice_key' => 'a']);

        $run->refresh();
        $this->assertSame(0, $run->passage_incorrect_words);
        $this->assertSame(100, $run->reading_accuracy_percent);
        $this->assertDatabaseHas('assessment_responses', [
            'assessment_run_id' => $run->id,
            'task_key' => 'task-3a',
            'score' => 100,
        ]);
    }

    public function test_skipped_passage_is_zero_and_still_opens_comprehension(): void
    {
        [$token, $run] = $this->createRun('task-3a', [
            'selected_story_key' => 'story:rosa-at-garden',
            'story_selected_at' => now(),
        ]);
        $passage = collect($run->content_snapshot['task-3a'])
            ->firstWhere('story_key', 'story:rosa-at-garden');

        $this->withToken($token)
            ->postJson("/api/learners/assessments/part-two/{$run->id}/skip", [
                'item_key' => $passage['item_key'],
            ])
            ->assertOk()
            ->assertJsonPath('stage', 'task-3b')
            ->assertJsonPath('item.question_text', 'Who goes to the garden?');

        $this->assertSame(0, $run->fresh()->reading_accuracy_percent);
        $this->assertDatabaseHas('assessment_responses', [
            'assessment_run_id' => $run->id,
            'task_key' => 'task-3a',
            'response_type' => 'skipped',
            'score' => 0,
        ]);
    }

    public function test_five_comprehension_choices_produce_server_owned_part_two_results(): void
    {
        [$token, $run] = $this->createRun('task-3b', [
            'selected_story_key' => 'story:lena-at-park',
            'story_selected_at' => now(),
            'passage_incorrect_words' => 10,
            'reading_accuracy_percent' => 80,
        ]);
        $questions = collect($run->content_snapshot['task-3b'])
            ->where('story_key', 'story:lena-at-park')
            ->sortBy('story_question_order')
            ->values();

        foreach ($questions as $index => $question) {
            $choice = $index < 4 ? $question['correct_choice_key'] : 'a';
            if ($choice === $question['correct_choice_key'] && $index === 4) {
                $choice = 'b';
            }
            $response = $this->withToken($token)
                ->postJson("/api/learners/assessments/part-two/{$run->id}/comprehension", [
                    'item_key' => $question['item_key'],
                    'choice' => $choice,
                ])
                ->assertOk();
            if ($index < 4) {
                $response->assertJsonPath('progress.current', $index + 2);
            }
        }

        $this->withToken($token)
            ->get('/api/learners/assessments/part-two/current')
            ->assertOk()
            ->assertJsonPath('stage', 'part-2-results')
            ->assertJsonPath('result.reading_accuracy_percent', 80)
            ->assertJsonPath('result.comprehension_score', 4)
            ->assertJsonPath('result.comprehension_percent', 80)
            ->assertJsonPath('result.score', 80)
            ->assertJsonPath('result.profile', 'Transitioning Reader');
    }

    public function test_completion_unlocks_the_first_required_lesson(): void
    {
        [$token, $run] = $this->createRun('part-2-results', [
            'selected_story_key' => 'story:lena-at-park',
            'reading_accuracy_percent' => 80,
            'comprehension_score' => 4,
            'comprehension_percent' => 80,
            'final_reading_score' => 80,
            'final_reading_profile' => 'Transitioning Reader',
            'part_two_completed_at' => now(),
        ]);

        $this->withToken($token)
            ->post("/api/learners/assessments/part-two/{$run->id}/continue")
            ->assertOk()
            ->assertJsonPath('stage', 'assessment-complete')
            ->assertJsonPath('completion.message', 'Your first lesson is ready.');

        $this->withToken($token)
            ->post("/api/learners/assessments/part-two/{$run->id}/finish")
            ->assertOk()
            ->assertJsonPath('completed', true)
            ->assertJsonPath('next_route', '/learner/dashboard');

        $this->assertSame(AssessmentRun::STATUS_COMPLETED, $run->fresh()->status);
        $progress = LearnerProgressState::query()->where('learner_id', $run->learner_id)->firstOrFail();
        $this->assertSame('required_lessons', $progress->stage);
        $this->assertSame(1, $progress->current_required_lesson_order);
        $this->assertNotNull($progress->diagnostic_completed_at);
    }

    /** @return array{string, AssessmentRun} */
    private function createRun(string $stage, array $extra = []): array
    {
        $learner = Learner::query()->create([
            'learner_code' => 'CD456',
            'password' => 'local-password',
            'first_name' => 'Rosa',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        $token = 'part-two-learner-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);
        $run = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => 'diagnostic',
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_ACTIVE,
            'stage' => $stage,
            'current_item_index' => 0,
            'content_snapshot' => app(AssessmentContentCatalog::class)->assessmentSnapshot(),
            'part_one_branch' => 'high',
            'task_1a_score' => 7,
            'task_2a_score' => 10,
            'task_2b_score' => 8,
            'part_one_score' => 25,
            'part_one_level' => 'Light Refresher',
            'orientation_completed_at' => now(),
            'part_one_completed_at' => now(),
            ...$extra,
        ]);

        return [$token, $run];
    }
}
