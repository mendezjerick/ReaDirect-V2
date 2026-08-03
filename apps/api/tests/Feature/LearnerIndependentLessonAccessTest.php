<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonRun;
use Tests\TestCase;

final class LearnerIndependentLessonAccessTest extends TestCase
{
    public function test_every_lesson_route_is_blocked_before_the_diagnostic_gate(): void
    {
        [$learner, $token] = $this->authenticatedLearner('IL001');
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::BASELINE_STAGE,
        ]);

        foreach (range(1, 6) as $order) {
            $this->withToken($token)
                ->postJson($this->startRoute($order))
                ->assertStatus(409)
                ->assertJsonPath(
                    'message',
                    'Complete or skip the Diagnostic Assessment before starting lessons.',
                );
        }
        $this->assertDatabaseCount('lesson_runs', 0);

        foreach (range(1, 6) as $order) {
            $run = $this->lessonRun($learner, $order);
            $this->withToken($token)
                ->getJson($this->showRoute($order, $run->id))
                ->assertStatus(409)
                ->assertJsonPath(
                    'message',
                    'Complete or skip the Diagnostic Assessment before starting lessons.',
                );
        }
    }

    public function test_all_lessons_can_start_in_any_order_and_resume_independently(): void
    {
        [$learner, $token] = $this->authenticatedLearner('IL002');
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::REQUIRED_LESSONS_STAGE,
            'current_required_lesson_order' => 1,
            'diagnostic_completed_at' => now(),
        ]);

        $runIds = [];
        foreach ([6, 2, 5, 1, 4, 3] as $order) {
            $response = $this->withToken($token)
                ->postJson($this->startRoute($order))
                ->assertOk()
                ->assertJsonPath('lesson_key', "required-lesson-{$order}")
                ->assertJsonPath('status', LessonRun::STATUS_ACTIVE);
            $runIds[$order] = $response->json('run_id');
        }
        $this->assertDatabaseCount('lesson_runs', 6);

        LessonRun::query()->findOrFail($runIds[4])->forceFill([
            'current_item_index' => 2,
        ])->save();
        $this->withToken($token)
            ->postJson($this->startRoute(4))
            ->assertOk()
            ->assertJsonPath('run_id', $runIds[4])
            ->assertJsonPath('progress.current', 3);

        LessonRun::query()->findOrFail($runIds[3])->forceFill([
            'status' => LessonRun::STATUS_REVIEW,
        ])->save();
        $this->withToken($token)
            ->postJson($this->startRoute(3))
            ->assertOk()
            ->assertJsonPath('run_id', $runIds[3])
            ->assertJsonPath('status', LessonRun::STATUS_REVIEW);

        $completedLessonTwo = LessonRun::query()->findOrFail($runIds[2]);
        $completedLessonTwo->forceFill([
            'status' => LessonRun::STATUS_COMPLETED,
            'completed_at' => now(),
        ])->save();
        $this->lessonRun($learner, 2);
        $this->withToken($token)
            ->postJson($this->startRoute(2))
            ->assertOk()
            ->assertJsonPath('run_id', $runIds[2])
            ->assertJsonPath('status', LessonRun::STATUS_COMPLETED)
            ->assertJsonPath('completion.title', 'Lesson 2 complete!');

        $this->assertDatabaseCount('lesson_runs', 7);
        $this->assertSame(
            1,
            LessonRun::query()
                ->where('learner_id', $learner->id)
                ->where('lesson_key', 'required-lesson-2')
                ->where('status', LessonRun::STATUS_COMPLETED)
                ->count(),
        );
    }

    public function test_skipping_the_diagnostic_unlocks_arbitrary_lessons(): void
    {
        [, $token] = $this->authenticatedLearner('IL003');

        $this->withToken($token)
            ->postJson('/api/learners/assessments/diagnostic/skip')
            ->assertOk()
            ->assertJsonPath('reading_path.diagnostic.status', 'skipped');

        $lessonSix = $this->withToken($token)
            ->postJson($this->startRoute(6))
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-6');
        $lessonTwo = $this->withToken($token)
            ->postJson($this->startRoute(2))
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-2');

        $this->assertNotSame($lessonSix->json('run_id'), $lessonTwo->json('run_id'));
        $this->assertDatabaseCount('lesson_runs', 2);
    }

    /** @return array{Learner, string} */
    private function authenticatedLearner(string $code): array
    {
        $learner = Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'independent-lesson-password',
            'first_name' => 'Independent',
            'middle_name' => 'Lesson',
            'last_name' => 'Learner',
            'suffix' => null,
            'lrn' => null,
            'school_id' => null,
            'teacher_id' => null,
            'grade_level' => 3,
            'section' => 'A',
            'is_active' => true,
        ]);
        $token = str_repeat(strtolower(substr($code, 0, 1)), 64);
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHours(12),
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
            'completed_at' => $status === LessonRun::STATUS_COMPLETED ? now() : null,
        ]);
    }

    private function startRoute(int $order): string
    {
        return "/api/learners/lessons/lesson-{$order}/start";
    }

    private function showRoute(int $order, int $runId): string
    {
        return "/api/learners/lessons/lesson-{$order}/{$runId}";
    }
}
