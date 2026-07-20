<?php

namespace Tests\Feature;

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

        $this->getJson("/api/staff/teacher/{$teacher->id}/overview")
            ->assertStatus(409);
    }

    private function createTeacher(): StaffUser
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);

        return StaffUser::query()->create([
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
    }
}
