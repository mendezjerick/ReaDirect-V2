<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonRun;
use Tests\TestCase;

final class LearnerFinalAssessmentTest extends TestCase
{
    public function test_final_assessment_is_locked_until_all_lessons_are_complete(): void
    {
        [$token] = $this->createLearnerSession(LearnerProgressState::BASELINE_STAGE);

        $response = $this->withToken($token)
            ->post('/api/learners/assessments/final/part-one/start');
        $this->assertSame(409, $response->status());

        $this->assertDatabaseMissing('assessment_runs', [
            'assessment_type' => AssessmentRun::TYPE_FINAL,
        ]);
    }

    public function test_final_part_one_uses_the_shared_fixed_form_and_isolated_run_type(): void
    {
        [$token, $learner] = $this->createLearnerSession(
            LearnerProgressState::FINAL_ASSESSMENT_STAGE,
        );

        $final = $this->withToken($token)
            ->post('/api/learners/assessments/final/part-one/start')
            ->assertOk()
            ->assertJsonPath('assessment_type', AssessmentRun::TYPE_FINAL)
            ->assertJsonPath('stage', 'orientation');

        $diagnostic = $this->withToken($token)
            ->post('/api/learners/assessments/part-one/start')
            ->assertOk()
            ->assertJsonPath('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC);

        $finalRun = AssessmentRun::query()->findOrFail($final->json('run_id'));
        $diagnosticRun = AssessmentRun::query()->findOrFail($diagnostic->json('run_id'));
        $this->assertSame($diagnosticRun->content_snapshot, $finalRun->content_snapshot);
        $this->assertSame($learner->id, $finalRun->learner_id);
        $this->assertNotSame($diagnosticRun->id, $finalRun->id);
    }

    public function test_final_skip_commits_zero_and_diagnostic_route_cannot_mutate_the_run(): void
    {
        [$token] = $this->createLearnerSession(
            LearnerProgressState::FINAL_ASSESSMENT_STAGE,
        );
        $run = $this->createFinalRun($token, 'task-1a');
        $item = $run->content_snapshot['task-1a'][0];

        $this->withToken($token)
            ->postJson("/api/learners/assessments/part-one/{$run->id}/skip", [
                'item_key' => $item['item_key'],
            ])
            ->assertNotFound();

        $this->withToken($token)
            ->postJson("/api/learners/assessments/final/part-one/{$run->id}/skip", [
                'item_key' => $item['item_key'],
            ])
            ->assertOk()
            ->assertJsonPath('assessment_type', AssessmentRun::TYPE_FINAL)
            ->assertJsonPath('progress.current', 2);

        $this->assertDatabaseHas('assessment_responses', [
            'assessment_run_id' => $run->id,
            'item_key' => $item['item_key'],
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'score' => 0,
        ]);
    }

    public function test_final_high_branch_completion_is_atomic_and_idempotent(): void
    {
        [$token, $learner] = $this->createLearnerSession(
            LearnerProgressState::FINAL_ASSESSMENT_STAGE,
        );
        $run = $this->createFinalRun($token, 'part-2-results', [
            'selected_story_key' => 'story:lena-at-park',
            'reading_accuracy_percent' => 80,
            'comprehension_score' => 4,
            'comprehension_percent' => 80,
            'final_reading_score' => 80,
            'final_reading_profile' => 'Transitioning Reader',
            'part_two_completed_at' => now(),
        ]);
        $this->seedJourneyAchievements($learner);

        $response = $this->withToken($token)
            ->post("/api/learners/assessments/final/part-two/{$run->id}/continue")
            ->assertOk()
            ->assertJsonPath('assessment_type', AssessmentRun::TYPE_FINAL)
            ->assertJsonPath('stage', 'assessment-complete')
            ->assertJsonPath('completion.kind', 'reading-journey-finale')
            ->assertJsonPath('completion.title', 'You finished your Reading Journey')
            ->assertJsonCount(8, 'completion.achievement_keys');

        $this->assertContains(
            'reading.readirect_champion',
            $response->json('completion.achievement_keys'),
        );
        $this->assertSame(AssessmentRun::STATUS_COMPLETED, $run->fresh()->status);

        $progress = LearnerProgressState::query()
            ->where('learner_id', $learner->id)
            ->firstOrFail();
        $this->assertSame(
            LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
            $progress->stage,
        );
        $this->assertNotNull($progress->diagnostic_completed_at);
        $this->assertNotNull($progress->final_assessment_completed_at);
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.readirect_champion',
        ]);

        $this->withToken($token)
            ->post("/api/learners/assessments/final/part-two/{$run->id}/finish")
            ->assertOk()
            ->assertJsonPath('next_route', '/learner/dashboard');
        $this->assertSame(
            1,
            LearnerAchievement::query()
                ->where('learner_id', $learner->id)
                ->where('achievement_key', 'reading.readirect_champion')
                ->count(),
        );
    }

    public function test_final_low_branch_skips_part_two_and_commits_the_same_finale(): void
    {
        [$token, $learner] = $this->createLearnerSession(
            LearnerProgressState::FINAL_ASSESSMENT_STAGE,
        );
        $run = $this->createFinalRun($token, 'part-1-results', [
            'part_one_branch' => 'low',
            'task_1a_score' => 6,
            'task_2a_score' => 8,
            'task_2b_score' => 0,
            'part_one_score' => 14,
            'part_one_level' => 'Moderate Refresher',
            'part_one_completed_at' => now(),
        ]);
        $this->seedJourneyAchievements($learner);

        $this->withToken($token)
            ->post("/api/learners/assessments/final/part-one/{$run->id}/continue")
            ->assertOk()
            ->assertJsonPath(
                'next_route',
                '/learner/final-assessment/complete',
            );

        $this->assertSame('assessment-complete', $run->fresh()->stage);
        $this->assertSame(AssessmentRun::STATUS_COMPLETED, $run->fresh()->status);
        $this->withToken($token)
            ->get('/api/learners/assessments/final/part-two/current')
            ->assertOk()
            ->assertJsonPath('completion.kind', 'reading-journey-finale')
            ->assertJsonCount(8, 'completion.achievement_keys');
    }

    /** @return array{string, Learner} */
    private function createLearnerSession(string $stage): array
    {
        $learner = Learner::query()->create([
            'learner_code' => 'FA001',
            'password' => 'local-password',
            'first_name' => 'Kristen',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => $stage,
            'current_required_lesson_order' => null,
            'diagnostic_completed_at' => $stage === LearnerProgressState::BASELINE_STAGE
                ? null
                : now()->subDay(),
            'last_confirmed_at' => now(),
        ]);
        $token = 'final-assessment-learner-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);
        if ($stage !== LearnerProgressState::BASELINE_STAGE) {
            foreach (range(1, 6) as $order) {
                LessonRun::query()->create([
                    'learner_id' => $learner->id,
                    'lesson_key' => "required-lesson-{$order}",
                    'content_version' => 'v1',
                    'status' => LessonRun::STATUS_COMPLETED,
                    'mission_key' => 'mission-1',
                    'current_item_index' => 0,
                    'content_snapshot' => [],
                    'completed_at' => now()->subHour(),
                ]);
            }
        }

        return [$token, $learner];
    }

    private function createFinalRun(
        string $token,
        string $stage,
        array $extra = [],
    ): AssessmentRun {
        $runId = $this->withToken($token)
            ->post('/api/learners/assessments/final/part-one/start')
            ->json('run_id');
        $run = AssessmentRun::query()->findOrFail($runId);
        $run->forceFill([
            'stage' => $stage,
            'current_item_index' => 0,
            'orientation_completed_at' => now(),
            ...$extra,
        ])->save();

        return $run->fresh();
    }

    private function seedJourneyAchievements(Learner $learner): void
    {
        foreach ([
            'reading.ready_reader',
            'reading.letter_leader',
            'reading.word_wizard',
            'reading.phrase_pro',
            'reading.sentence_star',
            'reading.passage_explorer',
            'reading.question_detective',
        ] as $achievementKey) {
            LearnerAchievement::query()->create([
                'learner_id' => $learner->id,
                'achievement_key' => $achievementKey,
                'awarded_at' => now()->subMinute(),
                'evidence' => ['test_prerequisite' => true],
            ]);
        }
    }
}
