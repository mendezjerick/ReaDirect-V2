<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\StaffUser;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class SchoolAdminTeacherTest extends TestCase
{
    public function test_school_administrator_creates_a_teacher_for_their_school(): void
    {
        $school = $this->createSchool('Northfield Elementary School');
        $schoolAdministrator = $this->createSchoolAdministrator($school->id);

        $response = $this->postJson("/api/staff/school-admin/{$schoolAdministrator->id}/teachers", [
            'username' => '  Grade4.Teacher  ',
            'temporary_password' => 'temporary-pass',
            'grade_level' => 4,
            'section' => '  Maple   Class  ',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('teacher.username', 'grade4.teacher')
            ->assertJsonPath('teacher.grade_level', 4)
            ->assertJsonPath('teacher.section', 'Maple Class')
            ->assertJsonPath('teacher.requires_credential_setup', true);

        $teacher = StaffUser::query()->where('username', 'grade4.teacher')->firstOrFail();

        $this->assertSame('teacher', $teacher->role);
        $this->assertSame($school->id, $teacher->school_id);
        $this->assertSame(4, $teacher->grade_level);
        $this->assertSame('Maple Class', $teacher->section);
        $this->assertTrue(Hash::check('temporary-pass', $teacher->password));
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $schoolAdministrator->id,
            'action_key' => 'teacher.created',
        ]);
    }

    public function test_teacher_directory_is_scoped_to_the_school_administrator_school(): void
    {
        $northfield = $this->createSchool('Northfield Elementary School');
        $southfield = $this->createSchool('Southfield Elementary School');
        $schoolAdministrator = $this->createSchoolAdministrator($northfield->id);

        $this->createTeacher('northfield-teacher', $northfield->id);
        $this->createTeacher('southfield-teacher', $southfield->id);

        $this->getJson("/api/staff/school-admin/{$schoolAdministrator->id}/teachers")
            ->assertOk()
            ->assertJsonCount(1, 'teachers')
            ->assertJsonPath('teachers.0.username', 'northfield-teacher');
    }

    public function test_teacher_creation_requires_grade_section_and_completed_school_setup(): void
    {
        $schoolAdministrator = $this->createSchoolAdministrator(null);

        $this->postJson("/api/staff/school-admin/{$schoolAdministrator->id}/teachers", [
            'username' => 'teacher-account',
            'temporary_password' => 'temporary-pass',
            'grade_level' => 4,
            'section' => 'Maple',
        ])->assertStatus(409);

        $school = $this->createSchool('Northfield Elementary School');
        $schoolAdministrator->update(['school_id' => $school->id]);

        $this->postJson("/api/staff/school-admin/{$schoolAdministrator->id}/teachers", [
            'username' => 'teacher-account',
            'temporary_password' => 'temporary-pass',
            'grade_level' => 7,
            'section' => '',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['grade_level', 'section']);
    }

    private function createSchool(string $name): School
    {
        return School::query()->create([
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
        ]);
    }

    private function createSchoolAdministrator(?int $schoolId): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'school-admin-test',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $schoolId,
            'display_name' => 'School Administrator',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);
    }

    private function createTeacher(string $username, int $schoolId): StaffUser
    {
        return StaffUser::query()->create([
            'username' => $username,
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $schoolId,
            'grade_level' => 3,
            'section' => 'Rose',
            'display_name' => 'Teacher',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);
    }
}
