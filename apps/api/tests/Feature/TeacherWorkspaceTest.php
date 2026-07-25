<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonRun;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class TeacherWorkspaceTest extends TestCase
{
    public function test_teacher_login_returns_the_assigned_grade_and_section(): void
    {
        $teacher = $this->createTeacher();

        $this->postJson('/api/staff/login', [
            'identifier' => $teacher->username,
            'password' => 'temporary-pass',
        ])
            ->assertOk()
            ->assertJsonPath('staff.role', 'teacher')
            ->assertJsonPath('staff.school.name', 'Northfield Elementary School')
            ->assertJsonPath('staff.grade_level', 1)
            ->assertJsonPath('staff.section', 'Maple')
            ->assertJsonPath('staff.requires_assignment_acknowledgement', true);
    }

    public function test_teacher_overview_is_scoped_to_the_assigned_class(): void
    {
        $teacher = $this->createTeacher();

        $this->getJson("/api/staff/teacher/{$teacher->id}/overview")
            ->assertOk()
            ->assertJsonPath('school.name', 'Northfield Elementary School')
            ->assertJsonPath('assignment.grade_level', 1)
            ->assertJsonPath('assignment.section', 'Maple')
            ->assertJsonPath('metrics.total_learners', 0)
            ->assertJsonPath('metrics.diagnostic_complete', 0)
            ->assertJsonPath('metrics.diagnostic_pending', 0)
            ->assertJsonPath('metrics.ready_for_final', 0)
            ->assertJsonPath('metrics.final_complete', 0)
            ->assertJsonPath('requires_assignment_acknowledgement', true);
    }

    public function test_teacher_overview_uses_persisted_progress_and_latest_assessment_results(): void
    {
        $teacher = $this->createTeacher();
        $dorothy = $this->createLearner($teacher, 'AA010', 'Dorothy', 'Gale', 'Wright');
        $matilda = $this->createLearner($teacher, 'AA011', 'Matilda', 'Book', 'Worm');

        LearnerProgressState::query()->create([
            'learner_id' => $dorothy->id,
            'stage' => LearnerProgressState::FINAL_ASSESSMENT_STAGE,
            'diagnostic_completed_at' => now()->subDays(2),
            'last_confirmed_at' => now()->subHour(),
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $matilda->id,
            'stage' => LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
            'diagnostic_completed_at' => now()->subDays(3),
            'final_assessment_completed_at' => now()->subMinutes(10),
            'last_confirmed_at' => now()->subMinutes(10),
        ]);

        $this->createAssessmentRun(
            $dorothy,
            AssessmentRun::TYPE_DIAGNOSTIC,
            'Moderate Refresher',
            'Developing Reader',
            now()->subDays(4),
        );
        $this->createAssessmentRun(
            $dorothy,
            AssessmentRun::TYPE_DIAGNOSTIC,
            'Light Refresher',
            'Transitioning Reader',
            now()->subDays(2),
        );
        $this->createAssessmentRun(
            $matilda,
            AssessmentRun::TYPE_DIAGNOSTIC,
            'Grade Ready',
            'Reading at Grade Level',
            now()->subDays(3),
        );
        $this->createAssessmentRun(
            $matilda,
            AssessmentRun::TYPE_FINAL,
            'Grade Ready',
            'Reading at Grade Level',
            now()->subMinutes(10),
        );

        LessonRun::query()->create([
            'learner_id' => $dorothy->id,
            'lesson_key' => 'required-lesson-6',
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_COMPLETED,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'completed_at' => now()->subMinutes(5),
        ]);

        $response = $this->getJson("/api/staff/teacher/{$teacher->id}/overview");

        $response
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 2)
            ->assertJsonPath('metrics.diagnostic_complete', 2)
            ->assertJsonPath('metrics.diagnostic_pending', 0)
            ->assertJsonPath('metrics.ready_for_final', 1)
            ->assertJsonPath('metrics.final_complete', 1)
            ->assertJsonPath('part_one_distribution.1.value', 0)
            ->assertJsonPath('part_one_distribution.2.value', 1)
            ->assertJsonPath('part_one_distribution.3.value', 1)
            ->assertJsonPath('diagnostic_reading_profile_distribution.3.value', 1)
            ->assertJsonPath('diagnostic_reading_profile_distribution.4.value', 1)
            ->assertJsonPath('final_reading_profile_distribution.4.value', 1)
            ->assertJsonPath('recent_learner_activity.0.learner_name', 'Dorothy Gale Wright')
            ->assertJsonPath('recent_learner_activity.0.title', 'Lesson 6 · Comprehension')
            ->assertJsonPath('recent_learner_activity.0.status', 'completed');
    }

    public function test_teacher_overview_excludes_other_teachers_and_portal_system_learners(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-overview-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 1,
            'section' => 'Rose',
            'display_name' => 'Other Teacher',
            'is_active' => true,
        ]);
        $otherLearner = $this->createLearner(
            $otherTeacher,
            'AA012',
            'Other',
            'Class',
            'Learner',
        );
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

        foreach ([$otherLearner, $portalLearner] as $learner) {
            LearnerProgressState::query()->create([
                'learner_id' => $learner->id,
                'stage' => LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
                'diagnostic_completed_at' => now()->subDay(),
                'final_assessment_completed_at' => now(),
                'last_confirmed_at' => now(),
            ]);
            $this->createAssessmentRun(
                $learner,
                AssessmentRun::TYPE_DIAGNOSTIC,
                'Grade Ready',
                'Reading at Grade Level',
                now(),
            );
        }

        $response = $this->getJson("/api/staff/teacher/{$teacher->id}/overview");

        $response
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 0)
            ->assertJsonPath('metrics.diagnostic_complete', 0)
            ->assertJsonPath('part_one_distribution.3.value', 0)
            ->assertJsonCount(0, 'recent_learner_activity');

        $body = $response->getContent();
        $this->assertStringNotContainsString('KW000', $body);
        $this->assertStringNotContainsString('Other Class Learner', $body);
    }

    public function test_teacher_can_acknowledge_the_first_login_assignment_once(): void
    {
        $teacher = $this->createTeacher();

        $this->postJson("/api/staff/teacher/{$teacher->id}/assignment-acknowledgement")
            ->assertOk()
            ->assertJsonPath('requires_assignment_acknowledgement', false);

        $this->assertNotNull($teacher->fresh()->teacher_assignment_acknowledged_at);
        $this->assertDatabaseCount('staff_audit_logs', 1);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $teacher->id,
            'action_key' => 'teacher.assignment_acknowledged',
        ]);

        $this->postJson("/api/staff/teacher/{$teacher->id}/assignment-acknowledgement")
            ->assertOk();

        $this->assertDatabaseCount('staff_audit_logs', 1);
    }

    public function test_incomplete_teacher_assignment_cannot_open_the_dashboard(): void
    {
        $teacher = StaffUser::query()->create([
            'username' => 'incomplete-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'display_name' => 'Teacher',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);
        $this->authenticateStaff($teacher);

        $this->getJson("/api/staff/teacher/{$teacher->id}/overview")
            ->assertStatus(409);
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

    private function createLearner(
        StaffUser $teacher,
        string $learnerCode,
        string $firstName,
        string $middleName,
        string $lastName,
    ): Learner {
        return Learner::query()->create([
            'learner_code' => $learnerCode,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'learner-pass',
            'first_name' => $firstName,
            'middle_name' => $middleName,
            'last_name' => $lastName,
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => $teacher->grade_level,
            'section' => $teacher->section,
            'is_active' => true,
        ]);
    }

    private function createAssessmentRun(
        Learner $learner,
        string $assessmentType,
        string $partOneLevel,
        string $readingProfile,
        mixed $completedAt,
    ): AssessmentRun {
        return AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => $assessmentType,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'assessment-complete',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'part_one_score' => 25,
            'part_one_level' => $partOneLevel,
            'final_reading_score' => 90,
            'final_reading_profile' => $readingProfile,
            'part_one_completed_at' => $completedAt,
            'part_two_completed_at' => $completedAt,
            'assessment_completed_at' => $completedAt,
        ]);
    }
}
