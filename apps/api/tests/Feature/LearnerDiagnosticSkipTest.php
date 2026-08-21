<?php

namespace Tests\Feature;

use App\Events\StaffDataChanged;
use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\School;
use App\Models\StaffUser;
use App\Services\AssessmentContentCatalog;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

final class LearnerDiagnosticSkipTest extends TestCase
{
    public function test_skip_records_a_normal_zero_score_low_path_diagnostic(): void
    {
        $school = $this->school();
        $teacher = $this->teacher($school);
        [$learner, $token] = $this->authenticatedLearner('DS001', $school, $teacher);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::BASELINE_STAGE,
        ]);
        Event::fake([StaffDataChanged::class]);

        $this->withToken($token)
            ->postJson('/api/learners/assessments/diagnostic/skip')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('reading_path.diagnostic', [
                'status' => 'completed',
                'score' => 0,
            ])
            ->assertJsonPath('reading_path.completed_lesson_count', 0)
            ->assertJsonPath('reading_path.final_assessment.status', 'locked')
            ->assertJsonCount(6, 'reading_path.lessons');

        $run = AssessmentRun::query()->sole();
        $this->assertSame(AssessmentRun::STATUS_COMPLETED, $run->status);
        $this->assertSame(AssessmentRun::COMPLETION_MODE_STANDARD, $run->completion_mode);
        $this->assertSame('assessment-complete', $run->stage);
        $this->assertSame('low', $run->part_one_branch);
        $this->assertSame(0, $run->task_1a_score);
        $this->assertSame(0, $run->task_2a_score);
        $this->assertSame(0, $run->task_2b_score);
        $this->assertSame(0, $run->part_one_score);
        $this->assertSame('Full Refresher', $run->part_one_level);
        $this->assertSame(0, $run->reading_accuracy_percent);
        $this->assertSame(0, $run->comprehension_score);
        $this->assertSame(0, $run->comprehension_percent);
        $this->assertSame(0, $run->final_reading_score);
        $this->assertSame('Low Emerging Reader', $run->final_reading_profile);
        $this->assertSame(50, $run->passage_incorrect_words);
        $this->assertNull($run->skipped_at);
        $this->assertNotNull($run->assessment_completed_at);
        $this->assertDatabaseCount('assessment_responses', 20);
        $this->assertSame(20, AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('decision', 'INCORRECT')
            ->where('score', 0)
            ->count());
        $this->assertDatabaseMissing('assessment_responses', [
            'assessment_run_id' => $run->id,
            'response_type' => 'skipped',
        ]);
        $this->assertDatabaseHas('learner_progress_states', [
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 1,
        ]);
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.ready_reader',
        ]);
        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('learner.achievement_keys.0', 'reading.ready_reader');
        Event::assertDispatchedTimes(StaffDataChanged::class, 1);

        $this->authenticateStaff($teacher);
        $this->getJson("/api/staff/teacher/{$teacher->id}/analytics")
            ->assertOk()
            ->assertJsonPath('assessment_skips.diagnostic', 0);
        $this->getJson("/api/staff/teacher/{$teacher->id}/assessments/diagnostic")
            ->assertOk()
            ->assertJsonPath('metrics.skipped_assessments', 0)
            ->assertJsonPath('metrics.with_skipped_items', 0)
            ->assertJsonPath(
                'learners.0.completion_mode',
                AssessmentRun::COMPLETION_MODE_STANDARD,
            )
            ->assertJsonPath('learners.0.final_reading_score', 0)
            ->assertJsonPath('learners.0.skipped_items_count', 0);
        $this->getJson("/api/staff/teacher/{$teacher->id}/reports")
            ->assertOk()
            ->assertJsonPath(
                'learners.0.diagnostic.completion_mode',
                AssessmentRun::COMPLETION_MODE_STANDARD,
            )
            ->assertJsonPath('learners.0.diagnostic.score', 0);
        $this->getJson("/api/staff/teacher/{$teacher->id}/overview")
            ->assertOk()
            ->assertJsonPath('metrics.diagnostic_complete', 1)
            ->assertJsonPath('metrics.diagnostic_pending', 0)
            ->assertJsonPath('part_one_distribution.0.value', 1)
            ->assertJsonPath('diagnostic_reading_profile_distribution.0.value', 1)
            ->assertJsonPath('recent_learner_activity.0.status', 'completed');

        $administrator = StaffUser::query()->create([
            'username' => 'diagnostic-skip-administrator',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $school->id,
            'display_name' => 'Diagnostic Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);
        $this->getJson("/api/staff/school-admin/{$administrator->id}/overview")
            ->assertOk()
            ->assertJsonPath('part_one_distribution.0.value', 1)
            ->assertJsonPath(
                'recent_assessment_activity.0.completion_mode',
                AssessmentRun::COMPLETION_MODE_STANDARD,
            )
            ->assertJsonPath('recent_assessment_activity.0.score', 0);
    }

    public function test_skip_preserves_active_diagnostic_answers_and_scores_only_the_remaining_items_as_zero(): void
    {
        [$learner, $token] = $this->authenticatedLearner('DS002');
        $snapshot = app(AssessmentContentCatalog::class)->assessmentSnapshot();
        $answeredItem = $snapshot['task-1a'][0];
        $run = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_ACTIVE,
            'stage' => 'task-1a',
            'current_item_index' => 1,
            'content_snapshot' => $snapshot,
        ]);
        AssessmentResponse::query()->create([
            'assessment_run_id' => $run->id,
            'task_key' => 'task-1a',
            'item_key' => $answeredItem['item_key'],
            'item_order' => (int) $answeredItem['sort_order'],
            'response_type' => 'speech',
            'decision' => 'CORRECT',
            'score' => 1,
            'evidence' => ['response_committed' => true],
        ]);

        $first = $this->withToken($token)
            ->postJson('/api/learners/assessments/diagnostic/skip')
            ->assertOk();
        $second = $this->withToken($token)
            ->postJson('/api/learners/assessments/diagnostic/skip')
            ->assertOk();

        $this->assertSame($first->json('reading_path'), $second->json('reading_path'));
        $this->assertSame(AssessmentRun::COMPLETION_MODE_STANDARD, $run->fresh()->completion_mode);
        $this->assertSame(1, $run->fresh()->task_1a_score);
        $this->assertSame(1, $run->fresh()->part_one_score);
        $this->assertSame(0, $run->fresh()->final_reading_score);
        $this->assertDatabaseCount('assessment_runs', 1);
        $this->assertDatabaseCount('assessment_responses', 20);
        $this->assertDatabaseHas('assessment_responses', [
            'assessment_run_id' => $run->id,
            'item_key' => $answeredItem['item_key'],
            'decision' => 'CORRECT',
            'score' => 1,
        ]);
        $this->assertSame(19, AssessmentResponse::query()
            ->where('assessment_run_id', $run->id)
            ->where('decision', 'INCORRECT')
            ->where('score', 0)
            ->count());
        $this->assertDatabaseCount('learner_achievements', 1);
    }

    public function test_portal_system_learner_can_skip_during_an_active_portal_session(): void
    {
        $learner = Learner::query()->create([
            'learner_code' => 'KW000',
            'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
            'password' => 'portal-password',
            'first_name' => 'Kristen',
            'middle_name' => 'Rhine',
            'last_name' => 'Wright',
            'is_active' => true,
        ]);
        $token = str_repeat('k', 64);
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'portal',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/assessments/diagnostic/skip')
            ->assertOk()
            ->assertJsonPath('reading_path.diagnostic', [
                'status' => 'completed',
                'score' => 0,
            ]);

        $this->assertDatabaseHas('learner_progress_states', [
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
        ]);
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.ready_reader',
        ]);
    }

    public function test_skip_rejects_a_normally_completed_diagnostic(): void
    {
        [$learner, $token] = $this->authenticatedLearner('DS003');
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'diagnostic_completed_at' => now(),
        ]);
        AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'completion_mode' => AssessmentRun::COMPLETION_MODE_STANDARD,
            'stage' => 'assessment-complete',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'final_reading_score' => 88,
            'assessment_completed_at' => now(),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/assessments/diagnostic/skip')
            ->assertStatus(409)
            ->assertJsonPath('message', 'The Diagnostic Assessment has already been completed.');

        $this->assertDatabaseHas('assessment_runs', [
            'learner_id' => $learner->id,
            'completion_mode' => AssessmentRun::COMPLETION_MODE_STANDARD,
            'final_reading_score' => 88,
        ]);
    }

    public function test_skip_rejects_after_final_assessment_is_available(): void
    {
        [$learner, $token] = $this->authenticatedLearner('DS004');
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::FINAL_ASSESSMENT_STAGE,
            'diagnostic_completed_at' => now()->subDay(),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/assessments/diagnostic/skip')
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'The Diagnostic Assessment cannot be skipped after the Final Assessment is available.',
            );

        $this->assertDatabaseCount('assessment_runs', 0);
    }

    /** @return array{Learner, string} */
    private function authenticatedLearner(
        string $code,
        ?School $school = null,
        ?StaffUser $teacher = null,
    ): array {
        $learner = Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'diagnostic-skip-password',
            'first_name' => 'Diagnostic',
            'middle_name' => 'Skip',
            'last_name' => 'Learner',
            'suffix' => null,
            'lrn' => null,
            'school_id' => $school?->id,
            'teacher_id' => $teacher?->id,
            'grade_level' => $teacher?->grade_level,
            'section' => $teacher?->section,
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

    private function school(): School
    {
        return School::query()->create([
            'name' => 'Diagnostic Skip School',
            'normalized_name' => 'diagnostic skip school',
        ]);
    }

    private function teacher(School $school): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'diagnostic-skip-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 3,
            'section' => 'Maple',
            'display_name' => 'Diagnostic Teacher',
            'is_active' => true,
        ]);
    }
}
