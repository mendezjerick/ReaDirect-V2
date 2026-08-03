<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonRun;
use Tests\TestCase;

final class LearnerReadingPathTest extends TestCase
{
    public function test_fresh_learner_session_returns_the_locked_reading_path(): void
    {
        [$learner, $token] = $this->authenticatedLearner('RP001');

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('reading_path.diagnostic.status', 'required')
            ->assertJsonPath('reading_path.diagnostic.score', null)
            ->assertJsonPath('reading_path.completed_lesson_count', 0)
            ->assertJsonPath('reading_path.final_assessment.status', 'locked')
            ->assertJsonCount(6, 'reading_path.lessons')
            ->assertJsonPath('reading_path.lessons.0', [
                'order' => 1,
                'status' => 'not_started',
            ])
            ->assertJsonPath('reading_path.lessons.5', [
                'order' => 6,
                'status' => 'not_started',
            ]);

        $this->assertDatabaseHas('learner_progress_states', [
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::BASELINE_STAGE,
        ]);
    }

    public function test_snapshot_uses_persisted_runs_and_counts_distinct_completed_lessons(): void
    {
        [$learner, $token] = $this->authenticatedLearner('RP002');
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 4,
            'diagnostic_completed_at' => now(),
        ]);
        $this->assessmentRun($learner, AssessmentRun::TYPE_DIAGNOSTIC, 'completed', 73);

        $this->lessonRun($learner, 1, LessonRun::STATUS_COMPLETED);
        $this->lessonRun($learner, 1, LessonRun::STATUS_COMPLETED);
        $this->lessonRun($learner, 3, LessonRun::STATUS_REVIEW);
        $this->lessonRun($learner, 6, LessonRun::STATUS_COMPLETED);

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('reading_path.diagnostic', [
                'status' => 'completed',
                'score' => 73,
            ])
            ->assertJsonPath('reading_path.completed_lesson_count', 2)
            ->assertJsonPath('reading_path.lessons.0.status', 'completed')
            ->assertJsonPath('reading_path.lessons.1.status', 'not_started')
            ->assertJsonPath('reading_path.lessons.2.status', 'in_progress')
            ->assertJsonPath('reading_path.lessons.5.status', 'completed')
            ->assertJsonPath('reading_path.final_assessment.status', 'locked');
    }

    public function test_final_assessment_status_is_derived_from_six_distinct_lesson_completions(): void
    {
        [$learner, $token] = $this->authenticatedLearner('RP003');
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'diagnostic_completed_at' => now(),
        ]);

        foreach (range(1, 6) as $order) {
            $this->lessonRun($learner, $order, LessonRun::STATUS_COMPLETED);
        }

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('reading_path.completed_lesson_count', 6)
            ->assertJsonPath('reading_path.final_assessment.status', 'available');

        $this->assessmentRun($learner, AssessmentRun::TYPE_FINAL, 'active');
        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('reading_path.final_assessment.status', 'in_progress');

        AssessmentRun::query()
            ->where('learner_id', $learner->id)
            ->where('assessment_type', AssessmentRun::TYPE_FINAL)
            ->update([
                'status' => AssessmentRun::STATUS_COMPLETED,
                'assessment_completed_at' => now(),
            ]);
        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('reading_path.final_assessment.status', 'completed');
    }

    /** @return array{Learner, string} */
    private function authenticatedLearner(string $code): array
    {
        $learner = Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'reading-path-password',
            'first_name' => 'Reading',
            'middle_name' => 'Test',
            'last_name' => 'Path',
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

    private function assessmentRun(
        Learner $learner,
        string $type,
        string $status,
        ?int $score = null,
    ): AssessmentRun {
        return AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => $type,
            'content_version' => 'v1',
            'status' => $status,
            'stage' => $status === AssessmentRun::STATUS_COMPLETED ? 'completed' : 'orientation',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'final_reading_score' => $score,
            'assessment_completed_at' => $status === AssessmentRun::STATUS_COMPLETED
                ? now()
                : null,
        ]);
    }

    private function lessonRun(Learner $learner, int $order, string $status): LessonRun
    {
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
}
