<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonRun;
use App\Services\LearnerLessonCompletionService;
use Tests\TestCase;

final class LearnerOrderIndependentCompletionTest extends TestCase
{
    public function test_any_lesson_can_be_the_sixth_distinct_completion(): void
    {
        [$learner, $token] = $this->learnerSession('OIC001');
        $completion = app(LearnerLessonCompletionService::class);
        $runs = collect([6, 1, 5, 2, 4, 3])
            ->mapWithKeys(fn (int $order): array => [
                $order => $this->lessonRun($learner, $order),
            ]);

        foreach ([6, 1, 5, 2, 4] as $order) {
            $result = $completion->complete(
                $runs->get($order),
                "reading.test.lesson-{$order}",
            );
            $this->assertFalse($result['final_assessment_ready']);
            if ($order === 6) {
                $earlyLessonSix = $completion->completionPayload(
                    $result['run'],
                    ['title' => 'Lesson 6 complete.'],
                );
                $this->assertSame('Lesson 6 complete.', $earlyLessonSix['title']);
                $this->assertFalse($earlyLessonSix['final_assessment_ready']);
                $this->assertTrue($earlyLessonSix['lessons'][5]['complete']);
                $this->assertFalse($earlyLessonSix['lessons'][0]['complete']);
            }
        }

        $this->assertSame(
            LearnerProgressState::REQUIRED_LESSONS_STAGE,
            $learner->progressState()->firstOrFail()->stage,
        );
        $this->withToken($token)
            ->postJson('/api/learners/assessments/final/part-one/start')
            ->assertStatus(409);

        $sixth = $completion->complete(
            $runs->get(3),
            'reading.test.lesson-3',
        );
        $payload = $completion->completionPayload($sixth['run'], [
            'title' => 'Lesson 3 complete.',
        ]);

        $this->assertSame(6, $sixth['completed_lesson_count']);
        $this->assertTrue($sixth['final_assessment_ready']);
        $this->assertSame(
            'You finished all six reading lessons.',
            $payload['title'],
        );
        $this->assertSame(
            'Your Final Assessment is now ready.',
            $payload['message'],
        );
        $this->assertSame(
            LearnerProgressState::FINAL_ASSESSMENT_STAGE,
            $learner->progressState()->firstOrFail()->stage,
        );
        $this->withToken($token)
            ->postJson('/api/learners/assessments/final/part-one/start')
            ->assertOk()
            ->assertJsonPath('assessment_type', AssessmentRun::TYPE_FINAL);
    }

    public function test_duplicate_completed_runs_do_not_unlock_the_final_assessment(): void
    {
        [$learner, $token] = $this->learnerSession('OIC002');
        $learner->progressState()->update([
            'stage' => LearnerProgressState::FINAL_ASSESSMENT_STAGE,
        ]);

        foreach ([1, 1, 2, 3, 4, 5] as $order) {
            $this->lessonRun($learner, $order, LessonRun::STATUS_COMPLETED);
        }

        $this->withToken($token)
            ->postJson('/api/learners/assessments/final/part-one/start')
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'Complete all six lessons before starting the Final Assessment.',
            );
        $this->assertDatabaseMissing('assessment_runs', [
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_FINAL,
        ]);
        $staleFinalRun = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_FINAL,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_ACTIVE,
            'stage' => 'story-selection',
            'current_item_index' => 0,
            'content_snapshot' => [],
        ]);
        $this->withToken($token)
            ->getJson(
                "/api/learners/assessments/final/part-one/{$staleFinalRun->id}",
            )
            ->assertStatus(409);
        $this->withToken($token)
            ->getJson('/api/learners/assessments/final/part-two/current')
            ->assertStatus(409);

        $learner->progressState()->update([
            'stage' => LearnerProgressState::REQUIRED_LESSONS_STAGE,
        ]);
        $this->lessonRun($learner, 6, LessonRun::STATUS_COMPLETED);

        $this->withToken($token)
            ->postJson('/api/learners/assessments/final/part-one/start')
            ->assertOk()
            ->assertJsonPath('run_id', $staleFinalRun->id);
    }

    public function test_completion_is_idempotent_for_run_and_achievement(): void
    {
        [$learner] = $this->learnerSession('OIC003');
        $completion = app(LearnerLessonCompletionService::class);
        $run = $this->lessonRun($learner, 4);

        $completion->complete($run, 'reading.sentence_star');
        $completion->complete($run, 'reading.sentence_star');

        $this->assertSame(1, $completion->completedLessonCount($learner->id));
        $this->assertDatabaseCount('lesson_runs', 1);
        $this->assertSame(
            1,
            LearnerAchievement::query()
                ->where('learner_id', $learner->id)
                ->where('achievement_key', 'reading.sentence_star')
                ->count(),
        );
    }

    /** @return array{Learner, string} */
    private function learnerSession(string $code): array
    {
        $learner = Learner::query()->create([
            'learner_code' => $code,
            'password' => 'order-independent-password',
            'first_name' => 'Order',
            'middle_name' => 'Independent',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::REQUIRED_LESSONS_STAGE,
            'current_required_lesson_order' => 1,
            'diagnostic_completed_at' => now()->subDay(),
        ]);
        $token = str_repeat(strtolower(substr($code, -1)), 64);
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [$learner, $token];
    }

    private function lessonRun(
        Learner $learner,
        int $order,
        string $status = LessonRun::STATUS_ACTIVE,
    ): LessonRun {
        return LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => "required-lesson-{$order}",
            'content_version' => 'v1',
            'status' => $status,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'completed_at' => $status === LessonRun::STATUS_COMPLETED
                ? now()->subMinute()
                : null,
        ]);
    }
}
