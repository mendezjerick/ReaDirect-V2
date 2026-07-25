<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminTeacherDashboardTest extends TestCase
{
    public function test_review_is_read_only_and_limited_to_an_in_school_teacher(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $northTeacher = $this->teacher('north-teacher', $northfield);
        $southTeacher = $this->teacher('south-teacher', $southfield);
        $northLearner = $this->learner('AA240', $northfield, $northTeacher);
        $this->learner('AA241', $southfield, $southTeacher);
        $progress = LearnerProgressState::query()->create([
            'learner_id' => $northLearner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 3,
        ]);

        $this->getJson(
            "/api/staff/school-admin/{$administrator->id}/teacher-dashboards/{$northTeacher->id}",
        )
            ->assertOk()
            ->assertJsonPath('teacher.username', 'north-teacher')
            ->assertJsonPath('overview.metrics.total_learners', 1)
            ->assertJsonPath('report.summary.learners', 1)
            ->assertJsonPath('report.learners.0.learner_code', 'AA240')
            ->assertJsonPath('read_only', true)
            ->assertJsonPath('impersonating', false)
            ->assertJsonMissing(['learner_code' => 'AA241']);

        $this->getJson(
            "/api/staff/school-admin/{$administrator->id}/teacher-dashboards/{$southTeacher->id}",
        )->assertNotFound();

        $this->assertDatabaseHas('learner_progress_states', [
            'id' => $progress->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 3,
        ]);
        $this->assertDatabaseCount('staff_audit_logs', 0);
        $this->assertNull($northTeacher->fresh()->teacher_assignment_acknowledged_at);
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
