<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminClassTest extends TestCase
{
    public function test_class_directory_is_derived_from_school_teacher_assignments(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $northTeacher = $this->teacher('north-teacher', $northfield);
        $this->teacher('south-teacher', $southfield);
        $this->learner('AA210', $northfield, $northTeacher);

        $this->getJson("/api/staff/school-admin/{$administrator->id}/classes")
            ->assertOk()
            ->assertJsonCount(1, 'classes')
            ->assertJsonPath('classes.0.username', 'north-teacher')
            ->assertJsonPath('classes.0.learner_count', 1)
            ->assertJsonPath('classes.0.active_learner_count', 1);
    }

    public function test_assignment_update_preserves_all_learner_flow_records(): void
    {
        $school = $this->school('Northfield Elementary School');
        $administrator = $this->administrator($school);
        $teacher = $this->teacher('maple-teacher', $school);
        $learner = $this->learner('AA211', $school, $teacher);
        $progress = LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 4,
        ]);
        $assessment = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'completed',
            'content_snapshot' => [],
            'part_one_score' => 18,
        ]);

        $this->putJson(
            "/api/staff/school-admin/{$administrator->id}/classes/{$teacher->id}",
            ['grade_level' => 4, 'section' => 'Cedar'],
        )
            ->assertOk()
            ->assertJsonPath('class.grade_level', 4)
            ->assertJsonPath('class.section', 'Cedar');

        $this->assertDatabaseHas('learners', [
            'id' => $learner->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 4,
            'section' => 'Cedar',
        ]);
        $this->assertDatabaseHas('learner_progress_states', [
            'id' => $progress->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 4,
        ]);
        $this->assertDatabaseHas('assessment_runs', [
            'id' => $assessment->id,
            'part_one_score' => 18,
            'status' => AssessmentRun::STATUS_COMPLETED,
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $administrator->id,
            'action_key' => 'class.assignment_updated',
        ]);
    }

    public function test_assignment_update_rejects_another_schools_teacher(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $otherTeacher = $this->teacher('south-teacher', $southfield);

        $this->putJson(
            "/api/staff/school-admin/{$administrator->id}/classes/{$otherTeacher->id}",
            ['grade_level' => 5, 'section' => 'Oak'],
        )->assertNotFound();
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
