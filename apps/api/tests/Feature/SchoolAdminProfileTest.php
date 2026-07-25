<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminProfileTest extends TestCase
{
    public function test_profile_is_scoped_and_updates_only_school_identity(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $teacher = $this->teacher($northfield);
        $learner = Learner::query()->create([
            'learner_code' => 'AA201',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'apple123',
            'first_name' => 'Dorothy',
            'middle_name' => 'Gale',
            'last_name' => 'Wright',
            'school_id' => $northfield->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 3,
            'section' => 'Maple',
        ]);
        $progress = LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 3,
        ]);

        $this->getJson("/api/staff/school-admin/{$administrator->id}/school-profile")
            ->assertOk()
            ->assertJsonPath('school.name', 'Northfield Elementary School')
            ->assertJsonPath('school.teachers', 1)
            ->assertJsonPath('school.learners', 1);

        $this->putJson("/api/staff/school-admin/{$administrator->id}/school-profile", [
            'school_name' => '  Northfield   Primary School  ',
        ])
            ->assertOk()
            ->assertJsonPath('school.name', 'Northfield Primary School');

        $this->assertDatabaseHas('schools', [
            'id' => $northfield->id,
            'normalized_name' => 'northfield primary school',
        ]);
        $this->assertDatabaseHas('schools', [
            'id' => $southfield->id,
            'name' => 'Southfield Elementary School',
        ]);
        $this->assertDatabaseHas('learner_progress_states', [
            'id' => $progress->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 3,
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $administrator->id,
            'action_key' => 'school.profile_updated',
        ]);
    }

    public function test_profile_rejects_another_school_name_and_another_staff_identity(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $otherAdministrator = StaffUser::query()->create([
            'username' => 'other-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $northfield->id,
            'display_name' => 'Other Administrator',
            'is_active' => true,
        ]);

        $this->putJson("/api/staff/school-admin/{$administrator->id}/school-profile", [
            'school_name' => 'Southfield Elementary School',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('school_name');

        $this->getJson("/api/staff/school-admin/{$otherAdministrator->id}/school-profile")
            ->assertForbidden();
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

    private function teacher(School $school): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'teacher-maple',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 3,
            'section' => 'Maple',
            'display_name' => 'Teacher',
            'is_active' => true,
        ]);
    }
}
