<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminReportTest extends TestCase
{
    public function test_report_aggregates_only_school_standard_learner_evidence(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $northTeacher = $this->teacher('north-teacher', $northfield);
        $southTeacher = $this->teacher('south-teacher', $southfield);
        $northLearner = $this->learner('AA230', $northfield, $northTeacher);
        $this->learner('AA231', $southfield, $southTeacher);
        $progress = LearnerProgressState::query()->create([
            'learner_id' => $northLearner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 2,
            'diagnostic_completed_at' => now(),
        ]);
        AssessmentRun::query()->create([
            'learner_id' => $northLearner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'completed',
            'content_snapshot' => [],
            'part_one_score' => 20,
            'assessment_completed_at' => now(),
        ]);

        $this->getJson("/api/staff/school-admin/{$administrator->id}/reports")
            ->assertOk()
            ->assertJsonPath('school.name', 'Northfield Elementary School')
            ->assertJsonPath('summary.teachers', 1)
            ->assertJsonPath('summary.learners', 1)
            ->assertJsonPath('summary.diagnostic_complete', 1)
            ->assertJsonCount(1, 'classes')
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.learner_code', 'AA230')
            ->assertJsonPath('learners.0.teacher.username', 'north-teacher')
            ->assertJsonMissing(['learner_code' => 'AA231']);

        $this->assertDatabaseHas('learner_progress_states', [
            'id' => $progress->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 2,
        ]);
        $this->assertDatabaseCount('staff_audit_logs', 0);
    }

    private function school(string $name): School
    {
        return School::query()->create([
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
        ]);
    }

    private function administrator(School $school): StaffUser
    {
        $administrator = StaffUser::query()->create([
            'username' => 'school-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $school->id,
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);

        return $administrator;
    }

    private function teacher(string $username, School $school): StaffUser
    {
        return StaffUser::query()->create([
            'username' => $username,
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 3,
            'section' => 'Maple',
            'display_name' => 'Teacher',
            'is_active' => true,
        ]);
    }

    private function learner(
        string $code,
        School $school,
        StaffUser $teacher,
    ): Learner {
        return Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'apple123',
            'first_name' => 'Dorothy',
            'middle_name' => 'Gale',
            'last_name' => 'Wright',
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 3,
            'section' => 'Maple',
        ]);
    }
}
