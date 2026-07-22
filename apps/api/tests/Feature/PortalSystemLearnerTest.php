<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\StaffUser;
use App\Services\LearnerCodeGenerator;
use Database\Seeders\PortalSystemLearnerSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class PortalSystemLearnerTest extends TestCase
{
    public function test_portal_system_learner_is_seeded_without_changing_the_standard_sequence(): void
    {
        (new PortalSystemLearnerSeeder)->run();

        $learner = Learner::query()->where('learner_code', 'KW000')->firstOrFail();

        $this->assertSame(Learner::PURPOSE_PORTAL_SYSTEM, $learner->account_purpose);
        $this->assertSame('Kristen', $learner->first_name);
        $this->assertSame('Rhine', $learner->middle_name);
        $this->assertSame('Wright', $learner->last_name);
        $this->assertNull($learner->school_id);
        $this->assertNull($learner->teacher_id);
        $this->assertNull($learner->grade_level);
        $this->assertNull($learner->section);
        $this->assertTrue(Hash::check('rhine359', $learner->password));
        $this->assertDatabaseHas('learner_code_counters', [
            'id' => 1,
            'next_value' => 0,
        ]);
        $this->assertDatabaseHas('learner_progress_states', [
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::BASELINE_STAGE,
        ]);
    }

    public function test_standard_sequence_skips_reserved_kw000(): void
    {
        DB::table('learner_code_counters')->where('id', 1)->update(['next_value' => 581999]);
        $generator = app(LearnerCodeGenerator::class);

        $firstCode = DB::transaction(fn (): string => $generator->next());
        $secondCode = DB::transaction(fn (): string => $generator->next());

        $this->assertSame('JW999', $firstCode);
        $this->assertSame('KW001', $secondCode);
        $this->assertDatabaseHas('learner_code_counters', [
            'id' => 1,
            'next_value' => 582002,
        ]);
    }

    public function test_portal_system_learner_is_excluded_from_analytics_but_visible_to_system_admin(): void
    {
        (new PortalSystemLearnerSeeder)->run();
        $systemAdministrator = $this->createSystemAdministrator();

        $this->getJson('/api/staff/system-admin/overview')
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 0);

        $this->getJson("/api/staff/system-admin/{$systemAdministrator->id}/page-portals")
            ->assertOk()
            ->assertJsonPath('learner.learner_code', 'KW000')
            ->assertJsonPath('learner.analytics_excluded', true)
            ->assertJsonPath('learner.progress_stage', 'before_diagnostic')
            ->assertJsonPath('portal_launch.available', true)
            ->assertJsonCount(5, 'portal_launch.targets');
    }

    public function test_kw000_can_use_normal_case_insensitive_learner_login(): void
    {
        (new PortalSystemLearnerSeeder)->run();

        $login = $this->postJson('/api/learners/login', [
            'learner_code' => 'kw000',
            'password' => 'rhine359',
        ])
            ->assertOk()
            ->assertJsonPath('learner.learner_code', 'KW000')
            ->assertJsonPath('learner.full_name', 'Kristen Rhine Wright')
            ->assertJsonPath('learner.progress.stage', 'before_diagnostic');

        $token = $login->json('token');

        $this->withToken($token)
            ->getJson('/api/learners/session')
            ->assertOk()
            ->assertJsonPath('learner.first_name', 'Kristen');

        $this->assertDatabaseHas('learner_sessions', [
            'learner_id' => Learner::query()->where('learner_code', 'KW000')->value('id'),
            'session_type' => 'standard',
            'revoked_at' => null,
        ]);
    }

    public function test_active_portal_run_blocks_normal_kw000_login(): void
    {
        (new PortalSystemLearnerSeeder)->run();
        $learner = Learner::query()->where('learner_code', 'KW000')->firstOrFail();
        $systemAdministrator = $this->createSystemAdministrator();

        LearnerPortalRun::query()->create([
            'learner_id' => $learner->id,
            'launched_by_staff_user_id' => $systemAdministrator->id,
            'target_key' => 'lesson-2',
            'status' => LearnerPortalRun::ACTIVE_STATUS,
            'started_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        $this->postJson('/api/learners/login', [
            'learner_code' => 'KW000',
            'password' => 'rhine359',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('learner_code');
    }

    public function test_manual_reset_returns_kristen_to_baseline_and_invalidates_sessions(): void
    {
        (new PortalSystemLearnerSeeder)->run();
        $learner = Learner::query()->where('learner_code', 'KW000')->firstOrFail();
        $systemAdministrator = $this->createSystemAdministrator();
        $progress = $learner->progressState()->firstOrFail();
        $progress->update([
            'stage' => 'required_lesson',
            'current_required_lesson_order' => 3,
            'diagnostic_completed_at' => now(),
        ]);
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', 'test-token'),
            'session_type' => 'standard',
            'expires_at' => now()->addHour(),
        ]);
        $portalRun = LearnerPortalRun::query()->create([
            'learner_id' => $learner->id,
            'launched_by_staff_user_id' => $systemAdministrator->id,
            'target_key' => 'lesson-3',
            'status' => LearnerPortalRun::ACTIVE_STATUS,
            'started_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        $this->postJson("/api/staff/system-admin/{$systemAdministrator->id}/page-portals/reset-kristen")
            ->assertOk()
            ->assertJsonPath('learner.progress_stage', 'before_diagnostic')
            ->assertJsonPath('learner.active_standard_sessions', 0)
            ->assertJsonPath('learner.active_portal_run', null);

        $progress->refresh();
        $this->assertSame('before_diagnostic', $progress->stage);
        $this->assertNull($progress->current_required_lesson_order);
        $this->assertNull($progress->diagnostic_completed_at);
        $this->assertNotNull($learner->fresh()->progress_reset_at);
        $this->assertNotNull(LearnerSession::query()->firstOrFail()->revoked_at);
        $this->assertSame('reset', $portalRun->fresh()->status);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'portal_system_learner.progress_reset',
        ]);
    }

    public function test_system_admin_can_launch_each_persisted_part_one_checkpoint(): void
    {
        (new PortalSystemLearnerSeeder)->run();
        $learner = Learner::query()->where('learner_code', 'KW000')->firstOrFail();
        $systemAdministrator = $this->createSystemAdministrator();
        $targets = [
            'assessment-orientation' => ['orientation', null, null, 0],
            'assessment-task-1a' => ['task-1a', null, null, 0],
            'assessment-task-2a' => ['task-2a', 6, null, 10],
            'assessment-task-2b' => ['task-2b', 7, 10, 10],
            'assessment-part-1-results' => ['part-1-results', 7, 10, 20],
        ];

        foreach ($targets as $targetKey => [$stage, $taskOneScore, $taskTwoAScore, $responseCount]) {
            $launch = $this->postJson(
                "/api/staff/system-admin/{$systemAdministrator->id}/page-portals/launch",
                ['target_key' => $targetKey],
            )
                ->assertOk()
                ->assertJsonPath('portal_launch.available', true)
                ->assertJsonPath('learner.active_portal_run.target_key', $targetKey)
                ->assertJsonPath('launch.target_key', $targetKey)
                ->assertJsonPath('launch.route', '/learner/assessment/part-one')
                ->assertJsonPath('launch.learner_session.learner.learner_code', 'KW000');

            $token = $launch->json('launch.learner_session.token');
            $this->withToken($token)
                ->post('/api/learners/assessments/part-one/start')
                ->assertOk()
                ->assertJsonPath('stage', $stage);

            $run = AssessmentRun::query()
                ->where('learner_id', $learner->id)
                ->latest('id')
                ->firstOrFail();
            $this->assertSame($stage, $run->stage);
            $this->assertSame($taskOneScore, $run->task_1a_score);
            $this->assertSame($taskTwoAScore, $run->task_2a_score);
            $this->assertSame(
                $responseCount,
                AssessmentResponse::query()
                    ->where('assessment_run_id', $run->id)
                    ->where('response_type', 'portal_prerequisite')
                    ->count(),
            );
        }

        $this->assertSame(1, LearnerPortalRun::query()
            ->where('learner_id', $learner->id)
            ->where('status', LearnerPortalRun::ACTIVE_STATUS)
            ->count());
        $this->assertDatabaseHas('learner_sessions', [
            'learner_id' => $learner->id,
            'session_type' => 'portal',
            'revoked_at' => null,
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'portal_system_learner.portal_launched',
        ]);
    }

    private function createSystemAdministrator(): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'system-admin-test',
            'password' => 'local-test-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
    }
}
