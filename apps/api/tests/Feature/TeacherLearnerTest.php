<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonItemAttempt;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\School;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\LessonTeachingStateMachine;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class TeacherLearnerTest extends TestCase
{
    public function test_teacher_creates_a_learner_with_generated_credentials_and_inherited_assignment(): void
    {
        $teacher = $this->createTeacher();

        $response = $this->postJson("/api/staff/teacher/{$teacher->id}/learners", [
            'first_name' => '  Dorothy  ',
            'middle_name' => '  Gale  ',
            'last_name' => '  Wright  ',
            'suffix' => '  Jr. ',
            'lrn' => '  123456789012  ',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('learner.learner_code', 'AA000')
            ->assertJsonPath('learner.full_name', 'Dorothy Gale Wright Jr.')
            ->assertJsonPath('learner.lrn', '123456789012')
            ->assertJsonPath('learner.grade_level', 1)
            ->assertJsonPath('learner.section', 'Maple');

        $temporaryPassword = $response->json('learner.temporary_password');

        $this->assertMatchesRegularExpression('/^(apple|orange|lemon)\d{3}$/', $temporaryPassword);

        $learner = Learner::query()->where('learner_code', 'AA000')->firstOrFail();

        $this->assertSame($teacher->school_id, $learner->school_id);
        $this->assertSame($teacher->id, $learner->teacher_id);
        $this->assertSame($teacher->grade_level, $learner->grade_level);
        $this->assertSame($teacher->section, $learner->section);
        $this->assertTrue(Hash::check($temporaryPassword, $learner->password));
        $this->assertNotSame($temporaryPassword, $learner->password);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $teacher->id,
            'action_key' => 'learner.created',
        ]);
    }

    public function test_learner_creation_rejects_every_missing_mandatory_name(): void
    {
        $teacher = $this->createTeacher();

        $this->postJson("/api/staff/teacher/{$teacher->id}/learners", [
            'first_name' => '',
            'middle_name' => ' ',
            'last_name' => '',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'middle_name', 'last_name']);

        $this->assertDatabaseCount('learners', 0);
        $this->assertDatabaseHas('learner_code_counters', [
            'id' => 1,
            'next_value' => 0,
        ]);
    }

    public function test_learner_code_generation_skips_existing_codes_when_the_counter_is_stale(): void
    {
        $teacher = $this->createTeacher();

        Learner::query()->create([
            'learner_code' => 'AA000',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'existing-learner-pass',
            'first_name' => 'Existing',
            'middle_name' => 'Class',
            'last_name' => 'Learner',
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => $teacher->grade_level,
            'section' => $teacher->section,
            'is_active' => true,
        ]);

        $this->assertSame(
            'AA001',
            $this->createLearner($teacher, 'New')->json('learner.learner_code'),
        );
    }

    public function test_learner_codes_follow_the_required_global_sequence_boundaries(): void
    {
        $teacher = $this->createTeacher();

        DB::table('learner_code_counters')->where('id', 1)->update(['next_value' => 999]);
        $this->assertSame('AA999', $this->createLearner($teacher, 'First')->json('learner.learner_code'));
        $this->assertSame('BA000', $this->createLearner($teacher, 'Second')->json('learner.learner_code'));

        DB::table('learner_code_counters')->where('id', 1)->update(['next_value' => 25999]);
        $this->assertSame('ZA999', $this->createLearner($teacher, 'Third')->json('learner.learner_code'));
        $this->assertSame('AB000', $this->createLearner($teacher, 'Fourth')->json('learner.learner_code'));
    }

    public function test_teacher_resets_an_assigned_learners_password_and_revokes_active_sessions(): void
    {
        $teacher = $this->createTeacher();
        $learner = Learner::query()->create([
            'learner_code' => 'AA000',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'old-learner-pass',
            'first_name' => 'Dorothy',
            'middle_name' => 'Gale',
            'last_name' => 'Wright',
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'is_active' => true,
        ]);
        $activeSession = LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', 'active-learner-token'),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHours(12),
        ]);
        $previouslyRevokedAt = now()->subHour()->startOfSecond();
        $revokedSession = LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', 'revoked-learner-token'),
            'session_type' => 'standard',
            'last_seen_at' => now()->subHours(2),
            'expires_at' => now()->addHours(10),
            'revoked_at' => $previouslyRevokedAt,
        ]);

        $response = $this->postJson(
            "/api/staff/teacher/{$teacher->id}/learners/{$learner->id}/reset-password",
        );

        $response
            ->assertOk()
            ->assertJsonPath('learner.id', $learner->id)
            ->assertJsonPath('learner.learner_code', 'AA000')
            ->assertJsonPath('learner.full_name', 'Dorothy Gale Wright');
        $temporaryPassword = $response->json('learner.temporary_password');
        $this->assertMatchesRegularExpression('/^(apple|orange|lemon)\d{3}$/', $temporaryPassword);

        $learner->refresh();
        $this->assertTrue(Hash::check($temporaryPassword, $learner->password));
        $this->assertFalse(Hash::check('old-learner-pass', $learner->password));
        $this->assertNotNull($activeSession->refresh()->revoked_at);
        $this->assertTrue($revokedSession->refresh()->revoked_at->equalTo($previouslyRevokedAt));

        $auditLog = StaffAuditLog::query()
            ->where('staff_user_id', $teacher->id)
            ->where('action_key', 'learner.password_reset')
            ->firstOrFail();
        $this->assertSame($learner->id, $auditLog->metadata['learner_id']);
        $this->assertSame('AA000', $auditLog->metadata['learner_code']);
        $this->assertTrue($auditLog->metadata['revoked_sessions']);
        $this->assertStringNotContainsString($temporaryPassword, $auditLog->description);
        $this->assertStringNotContainsString($temporaryPassword, json_encode($auditLog->metadata, JSON_THROW_ON_ERROR));

        $this->postJson('/api/learners/login', [
            'learner_code' => 'AA000',
            'password' => 'old-learner-pass',
        ])->assertUnprocessable();
        $this->postJson('/api/learners/login', [
            'learner_code' => 'AA000',
            'password' => $temporaryPassword,
        ])->assertOk();
    }

    public function test_teacher_cannot_reset_another_teachers_portal_system_or_inactive_learner(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-reset-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 1,
            'section' => 'Rose',
            'display_name' => 'Other Teacher',
            'is_active' => true,
        ]);
        $restrictedLearners = collect([
            Learner::query()->create([
                'learner_code' => 'AA001',
                'account_purpose' => Learner::PURPOSE_STANDARD,
                'password' => 'other-pass',
                'first_name' => 'Other',
                'middle_name' => 'Class',
                'last_name' => 'Learner',
                'school_id' => $teacher->school_id,
                'teacher_id' => $otherTeacher->id,
                'grade_level' => 1,
                'section' => 'Rose',
                'is_active' => true,
            ]),
            Learner::query()->create([
                'learner_code' => 'KW000',
                'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
                'password' => 'portal-pass',
                'first_name' => 'Kristen',
                'middle_name' => 'Rhine',
                'last_name' => 'Wright',
                'school_id' => $teacher->school_id,
                'teacher_id' => $teacher->id,
                'grade_level' => 1,
                'section' => 'Maple',
                'is_active' => true,
            ]),
            Learner::query()->create([
                'learner_code' => 'AA002',
                'account_purpose' => Learner::PURPOSE_STANDARD,
                'password' => 'inactive-pass',
                'first_name' => 'Inactive',
                'middle_name' => 'Class',
                'last_name' => 'Learner',
                'school_id' => $teacher->school_id,
                'teacher_id' => $teacher->id,
                'grade_level' => 1,
                'section' => 'Maple',
                'is_active' => false,
            ]),
        ]);
        $originalPasswordHashes = $restrictedLearners
            ->mapWithKeys(fn (Learner $learner): array => [$learner->id => $learner->password]);

        foreach ($restrictedLearners as $restrictedLearner) {
            $this->postJson(
                "/api/staff/teacher/{$teacher->id}/learners/{$restrictedLearner->id}/reset-password",
            )->assertNotFound();

            $this->assertSame(
                $originalPasswordHashes->get($restrictedLearner->id),
                $restrictedLearner->refresh()->password,
            );
        }

        $this->assertDatabaseMissing('staff_audit_logs', [
            'staff_user_id' => $teacher->id,
            'action_key' => 'learner.password_reset',
        ]);
    }

    public function test_teacher_imports_a_validated_roster_atomically_with_one_time_credentials(): void
    {
        $teacher = $this->createTeacher();

        $response = $this->postJson("/api/staff/teacher/{$teacher->id}/learners/import", [
            'learners' => [
                [
                    'first_name' => ' Dorothy ',
                    'middle_name' => ' Gale ',
                    'last_name' => ' Wright ',
                    'suffix' => '',
                    'lrn' => ' 10001 ',
                ],
                [
                    'first_name' => 'Emilio',
                    'middle_name' => 'Rizal',
                    'last_name' => 'Santos',
                    'suffix' => 'Jr.',
                    'lrn' => null,
                ],
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonCount(2, 'learners')
            ->assertJsonPath('learners.0.learner_code', 'AA000')
            ->assertJsonPath('learners.0.full_name', 'Dorothy Gale Wright')
            ->assertJsonPath('learners.1.learner_code', 'AA001')
            ->assertJsonPath('learners.1.full_name', 'Emilio Rizal Santos Jr.');

        foreach ($response->json('learners') as $credential) {
            $this->assertMatchesRegularExpression(
                '/^(apple|orange|lemon)\d{3}$/',
                $credential['temporary_password'],
            );
            $learner = Learner::query()->findOrFail($credential['id']);
            $this->assertSame($teacher->id, $learner->teacher_id);
            $this->assertSame($teacher->school_id, $learner->school_id);
            $this->assertSame(1, $learner->grade_level);
            $this->assertSame('Maple', $learner->section);
            $this->assertTrue(Hash::check($credential['temporary_password'], $learner->password));
        }

        $auditLog = StaffAuditLog::query()
            ->where('action_key', 'learner.imported')
            ->firstOrFail();
        $this->assertSame(2, $auditLog->metadata['learner_count']);
        $this->assertCount(2, $auditLog->metadata['learner_ids']);
        foreach ($response->json('learners') as $credential) {
            $this->assertStringNotContainsString(
                $credential['temporary_password'],
                json_encode($auditLog->metadata, JSON_THROW_ON_ERROR),
            );
        }
    }

    public function test_learner_import_rejects_the_entire_roster_when_any_row_is_invalid(): void
    {
        $teacher = $this->createTeacher();

        $this->postJson("/api/staff/teacher/{$teacher->id}/learners/import", [
            'learners' => [
                [
                    'first_name' => 'Valid',
                    'middle_name' => 'Middle',
                    'last_name' => 'Learner',
                ],
                [
                    'first_name' => 'Missing',
                    'middle_name' => '',
                    'last_name' => 'Middle Name',
                ],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['learners.1.middle_name']);

        $this->assertDatabaseCount('learners', 0);
        $this->assertDatabaseMissing('staff_audit_logs', [
            'action_key' => 'learner.imported',
        ]);
    }

    public function test_teacher_issues_a_credential_sheet_that_rotates_selected_passwords_and_sessions(): void
    {
        $teacher = $this->createTeacher();
        $learners = collect(['Dorothy', 'Emilio'])->map(
            fn (string $firstName, int $index): Learner => Learner::query()->create([
                'learner_code' => 'AA00'.$index,
                'account_purpose' => Learner::PURPOSE_STANDARD,
                'password' => 'old-pass-'.$index,
                'first_name' => $firstName,
                'middle_name' => 'Middle',
                'last_name' => 'Learner',
                'school_id' => $teacher->school_id,
                'teacher_id' => $teacher->id,
                'grade_level' => 1,
                'section' => 'Maple',
                'is_active' => true,
            ]),
        );
        foreach ($learners as $index => $learner) {
            LearnerSession::query()->create([
                'learner_id' => $learner->id,
                'token_hash' => hash('sha256', 'sheet-session-'.$index),
                'session_type' => 'standard',
                'expires_at' => now()->addHours(12),
            ]);
        }

        $response = $this->postJson(
            "/api/staff/teacher/{$teacher->id}/learners/credential-sheet",
            ['learner_ids' => $learners->pluck('id')->all()],
        );

        $response->assertOk()->assertJsonCount(2, 'learners');
        foreach ($response->json('learners') as $index => $credential) {
            $this->assertMatchesRegularExpression(
                '/^(apple|orange|lemon)\d{3}$/',
                $credential['temporary_password'],
            );
            $learner = $learners[$index]->refresh();
            $this->assertTrue(Hash::check($credential['temporary_password'], $learner->password));
            $this->assertFalse(Hash::check('old-pass-'.$index, $learner->password));
            $this->assertDatabaseMissing('learner_sessions', [
                'learner_id' => $learner->id,
                'revoked_at' => null,
            ]);
        }

        $auditLog = StaffAuditLog::query()
            ->where('action_key', 'learner.credentials_issued')
            ->firstOrFail();
        $this->assertSame(2, $auditLog->metadata['learner_count']);
        $this->assertTrue($auditLog->metadata['sessions_revoked']);
        foreach ($response->json('learners') as $credential) {
            $this->assertStringNotContainsString(
                $credential['temporary_password'],
                json_encode($auditLog->metadata, JSON_THROW_ON_ERROR),
            );
        }
    }

    public function test_credential_sheet_rejects_an_out_of_scope_learner_without_rotating_any_password(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-sheet-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 1,
            'section' => 'Rose',
            'display_name' => 'Other Teacher',
            'is_active' => true,
        ]);
        $assignedLearner = Learner::query()->create([
            'learner_code' => 'AA000',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'assigned-pass',
            'first_name' => 'Assigned',
            'middle_name' => 'Class',
            'last_name' => 'Learner',
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'is_active' => true,
        ]);
        $otherLearner = Learner::query()->create([
            'learner_code' => 'AA001',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'other-pass',
            'first_name' => 'Other',
            'middle_name' => 'Class',
            'last_name' => 'Learner',
            'school_id' => $teacher->school_id,
            'teacher_id' => $otherTeacher->id,
            'grade_level' => 1,
            'section' => 'Rose',
            'is_active' => true,
        ]);
        $assignedHash = $assignedLearner->password;
        $otherHash = $otherLearner->password;

        $this->postJson(
            "/api/staff/teacher/{$teacher->id}/learners/credential-sheet",
            ['learner_ids' => [$assignedLearner->id, $otherLearner->id]],
        )->assertNotFound();

        $this->assertSame($assignedHash, $assignedLearner->refresh()->password);
        $this->assertSame($otherHash, $otherLearner->refresh()->password);
        $this->assertDatabaseMissing('staff_audit_logs', [
            'action_key' => 'learner.credentials_issued',
        ]);
    }

    public function test_teacher_directory_only_returns_their_assigned_learners(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 2,
            'section' => 'Rose',
            'display_name' => 'Teacher',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->createLearner($teacher, 'Assigned');
        $this->authenticateStaff($otherTeacher);
        $this->createLearner($otherTeacher, 'Other');

        $this->authenticateStaff($teacher);
        $this->getJson("/api/staff/teacher/{$teacher->id}/learners")
            ->assertOk()
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.first_name', 'Assigned');
    }

    public function test_dashboard_totals_include_created_learners_in_the_correct_scope(): void
    {
        $teacher = $this->createTeacher();
        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-test',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $teacher->school_id,
            'display_name' => 'School Administrator',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->createLearner($teacher, 'Assigned');

        $this->getJson("/api/staff/teacher/{$teacher->id}/overview")
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 1)
            ->assertJsonPath('metrics.diagnostic_pending', 1);

        $this->authenticateStaff($schoolAdministrator);
        $this->getJson("/api/staff/school-admin/{$schoolAdministrator->id}/overview")
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 1)
            ->assertJsonPath('metrics.active_learners', 1);

        $systemAdministrator = StaffUser::query()->create([
            'username' => 'system-admin-test',
            'password' => 'temporary-pass',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($systemAdministrator);
        $this->getJson('/api/staff/system-admin/overview')
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 1);
    }

    public function test_teacher_reads_persisted_detail_for_an_assigned_standard_learner(): void
    {
        $teacher = $this->createTeacher();
        $learner = Learner::query()->create([
            'learner_code' => 'AA000',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'learner-pass',
            'first_name' => 'Dorothy',
            'middle_name' => 'Gale',
            'last_name' => 'Wright',
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 3,
            'diagnostic_completed_at' => now()->subDay(),
            'last_confirmed_at' => now(),
        ]);

        $diagnostic = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'assessment_complete',
            'current_item_index' => 0,
            'content_snapshot' => [
                'task-1a' => [[
                    'item_key' => 'task-1a-01',
                    'display_text' => 'A a',
                ]],
            ],
            'part_one_branch' => 'high',
            'task_1a_score' => 8,
            'task_2a_score' => 10,
            'task_2b_score' => 7,
            'part_one_score' => 25,
            'part_one_level' => 'Light Refresher',
            'reading_accuracy_percent' => 82,
            'comprehension_score' => 4,
            'comprehension_percent' => 80,
            'final_reading_score' => 81,
            'final_reading_profile' => 'Transitioning Reader',
            'part_one_completed_at' => now()->subDay(),
            'part_two_completed_at' => now()->subDay(),
            'assessment_completed_at' => now()->subDay(),
        ]);
        AssessmentResponse::query()->create([
            'assessment_run_id' => $diagnostic->id,
            'task_key' => 'task-1a',
            'item_key' => 'task-1a-01',
            'item_order' => 1,
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'score' => 0,
        ]);

        $lesson = LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => 'required-lesson-2',
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_COMPLETED,
            'mission_key' => 'mission-2',
            'current_item_index' => 0,
            'content_snapshot' => [
                'mission-1' => [[
                    'content_id' => 'lesson-v1-word-bag',
                    'display_text' => 'bag',
                ]],
            ],
            'completed_at' => now(),
        ]);
        $lessonResponse = LessonResponse::query()->create([
            'lesson_run_id' => $lesson->id,
            'mission_key' => 'mission-1',
            'item_key' => 'lesson-v1-word-bag',
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'private raw model text',
            'final_transcript' => 'bag',
            'decision' => 'CORRECT',
            'audio_path' => 'private/lesson-audio.wav',
            'audio_sha256' => str_repeat('a', 64),
            'evidence' => ['private' => 'service evidence'],
            'teaching_state' => 'INDEPENDENT_FEEDBACK',
            'outcome' => 'SUPPORTED_CORRECT',
            'academic_attempt_count' => 2,
            'technical_retry_count' => 1,
            'highest_scaffold_used' => 'targeted_clue',
            'independent_mastery' => false,
            'diagnosis_key' => 'final_letter_substitution',
            'review_recommended' => true,
            'completed_at' => now(),
        ]);
        LessonItemAttempt::query()->create([
            'lesson_response_id' => $lessonResponse->id,
            'attempt_sequence' => 1,
            'attempt_kind' => LessonItemAttempt::KIND_INDEPENDENT,
            'academic_attempt_number' => 1,
            'scaffold_level' => 'none',
            'audio_classification' => LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT,
            'raw_transcript' => 'private attempt raw text',
            'final_transcript' => 'bat',
            'decision' => 'INCORRECT',
            'audio_path' => 'private/attempt.wav',
            'audio_sha256' => str_repeat('b', 64),
            'evidence' => ['private' => 'attempt evidence'],
        ]);
        LessonItemAttempt::query()->create([
            'lesson_response_id' => $lessonResponse->id,
            'attempt_sequence' => 2,
            'attempt_kind' => LessonItemAttempt::KIND_GUIDED,
            'academic_attempt_number' => 2,
            'scaffold_level' => 'targeted_clue',
            'audio_classification' => LessonTeachingStateMachine::CLASS_CLEAR_CORRECT,
            'final_transcript' => 'bag',
            'decision' => 'CORRECT',
        ]);

        $response = $this->getJson(
            "/api/staff/teacher/{$teacher->id}/learners/{$learner->id}",
        );

        $response
            ->assertOk()
            ->assertJsonPath('learner.learner_code', 'AA000')
            ->assertJsonPath('learner.full_name', 'Dorothy Gale Wright')
            ->assertJsonPath('class_context.school.name', 'Northfield Elementary School')
            ->assertJsonPath('class_context.grade_level', 1)
            ->assertJsonPath('class_context.section', 'Maple')
            ->assertJsonPath('progression.stage', 'required_lessons')
            ->assertJsonPath(
                'progression.stage_label',
                'Reading lessons · 1 of 6 complete',
            )
            ->assertJsonPath('progression.current_required_lesson_order', 3)
            ->assertJsonPath('reading_path.completed_lesson_count', 1)
            ->assertJsonPath('reading_path.lessons.1.status', 'completed')
            ->assertJsonPath('assessments.diagnostic.part_one_score', 25)
            ->assertJsonPath('assessments.diagnostic.completion_mode', 'standard')
            ->assertJsonPath('assessments.diagnostic.final_reading_profile', 'Transitioning Reader')
            ->assertJsonPath('assessments.final', null)
            ->assertJsonCount(1, 'skipped_assessment_items')
            ->assertJsonPath('skipped_assessment_items.0.item_label', 'A a')
            ->assertJsonPath('lessons.1.lesson_key', 'required-lesson-2')
            ->assertJsonPath('lessons.1.status', LessonRun::STATUS_COMPLETED)
            ->assertJsonPath('lessons.1.performance.practice_attempts', 1)
            ->assertJsonPath('lessons.1.performance.review_recommended', 1)
            ->assertJsonPath('lessons.1.items.0.target_label', 'bag')
            ->assertJsonPath('lessons.1.items.0.final_transcript', 'bag')
            ->assertJsonPath('lessons.1.items.0.attempts.0.final_transcript', 'bat')
            ->assertJsonPath('lessons.1.items.0.attempts.0.incorrect', true)
            ->assertJsonPath('lessons.1.items.0.highest_scaffold_used', 'targeted_clue')
            ->assertJsonCount(2, 'recommendations');

        $body = $response->getContent();
        $this->assertStringNotContainsString('private raw model text', $body);
        $this->assertStringNotContainsString('private attempt raw text', $body);
        $this->assertStringNotContainsString('private/lesson-audio.wav', $body);
        $this->assertStringNotContainsString('service evidence', $body);
    }

    public function test_teacher_cannot_read_another_teachers_learner_or_a_portal_system_learner(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-detail-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 1,
            'section' => 'Rose',
            'display_name' => 'Other Teacher',
            'is_active' => true,
        ]);
        $otherLearner = Learner::query()->create([
            'learner_code' => 'AA001',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'learner-pass',
            'first_name' => 'Other',
            'middle_name' => 'Class',
            'last_name' => 'Learner',
            'school_id' => $teacher->school_id,
            'teacher_id' => $otherTeacher->id,
            'grade_level' => 1,
            'section' => 'Rose',
            'is_active' => true,
        ]);
        $portalLearner = Learner::query()->create([
            'learner_code' => 'KW000',
            'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
            'password' => 'portal-pass',
            'first_name' => 'Kristen',
            'middle_name' => 'Rhine',
            'last_name' => 'Wright',
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'is_active' => true,
        ]);

        $this->getJson(
            "/api/staff/teacher/{$teacher->id}/learners/{$otherLearner->id}",
        )->assertNotFound();
        $this->getJson(
            "/api/staff/teacher/{$teacher->id}/learners/{$portalLearner->id}",
        )->assertNotFound();
    }

    private function createTeacher(): StaffUser
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);

        $teacher = StaffUser::query()->create([
            'username' => 'teacher-test',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'display_name' => 'Teacher',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->authenticateStaff($teacher);

        return $teacher;
    }

    private function createLearner(StaffUser $teacher, string $firstName): TestResponse
    {
        return $this->postJson("/api/staff/teacher/{$teacher->id}/learners", [
            'first_name' => $firstName,
            'middle_name' => 'Middle',
            'last_name' => 'Learner',
        ])->assertCreated();
    }
}
