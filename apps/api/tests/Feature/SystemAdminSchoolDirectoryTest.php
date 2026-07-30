<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SystemAdminSchoolDirectoryTest extends TestCase
{
    public function test_system_administrator_can_view_truthful_school_counts(): void
    {
        $systemAdministrator = $this->staffUser('system-admin', 'system_admin');
        $this->authenticateStaff($systemAdministrator);

        $alphaSchool = School::query()->create([
            'name' => 'Alpha Elementary',
            'normalized_name' => 'alpha elementary',
        ]);
        $bravoSchool = School::query()->create([
            'name' => 'Bravo Elementary',
            'normalized_name' => 'bravo elementary',
        ]);

        $this->staffUser('alpha-admin', 'school_admin', $alphaSchool, true);
        $this->staffUser('alpha-admin-inactive', 'school_admin', $alphaSchool, false);
        $alphaTeacher = $this->staffUser('alpha-teacher', 'teacher', $alphaSchool, true);
        $this->staffUser('bravo-teacher-inactive', 'teacher', $bravoSchool, false);
        $this->staffUser('pending-admin', 'school_admin');

        $this->learner('AA001', $alphaSchool, $alphaTeacher, Learner::PURPOSE_STANDARD, true);
        $this->learner('AA002', $alphaSchool, $alphaTeacher, Learner::PURPOSE_STANDARD, false);
        $this->learner('KW000', $alphaSchool, $alphaTeacher, Learner::PURPOSE_PORTAL_SYSTEM, true);

        $this->getJson('/api/staff/system-admin/schools')
            ->assertOk()
            ->assertJsonPath('summary.total_schools', 2)
            ->assertJsonPath('summary.active_school_administrators', 1)
            ->assertJsonPath('summary.active_teachers', 1)
            ->assertJsonPath('summary.active_learners', 1)
            ->assertJsonPath('summary.unassigned_school_administrators', 1)
            ->assertJsonPath('schools.0.name', 'Alpha Elementary')
            ->assertJsonPath('schools.0.school_administrators.total', 2)
            ->assertJsonPath('schools.0.school_administrators.active', 1)
            ->assertJsonPath('schools.0.teachers.total', 1)
            ->assertJsonPath('schools.0.teachers.active', 1)
            ->assertJsonPath('schools.0.learners.total', 2)
            ->assertJsonPath('schools.0.learners.active', 1)
            ->assertJsonPath('schools.1.name', 'Bravo Elementary')
            ->assertJsonPath('schools.1.school_administrators.total', 0)
            ->assertJsonPath('schools.1.teachers.total', 1)
            ->assertJsonPath('schools.1.teachers.active', 0)
            ->assertJsonPath('schools.1.learners.total', 0)
            ->assertJsonStructure([
                'summary',
                'schools' => [
                    '*' => [
                        'id',
                        'name',
                        'school_administrators' => ['total', 'active'],
                        'teachers' => ['total', 'active'],
                        'learners' => ['total', 'active'],
                        'created_at',
                    ],
                ],
                'generated_at',
            ]);
    }

    public function test_school_directory_is_restricted_to_system_administrators(): void
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary',
            'normalized_name' => 'northfield elementary',
        ]);
        $schoolAdministrator = $this->staffUser(
            'northfield-admin',
            'school_admin',
            $school,
        );
        $this->authenticateStaff($schoolAdministrator);

        $this->getJson('/api/staff/system-admin/schools')->assertForbidden();
    }

    private function staffUser(
        string $username,
        string $role,
        ?School $school = null,
        bool $isActive = true,
    ): StaffUser {
        return StaffUser::query()->create([
            'username' => $username,
            'password' => 'local-test-password',
            'role' => $role,
            'school_id' => $school?->id,
            'display_name' => match ($role) {
                'system_admin' => 'System Administrator',
                'school_admin' => 'School Administrator',
                default => 'Teacher',
            },
            'is_active' => $isActive,
        ]);
    }

    private function learner(
        string $learnerCode,
        School $school,
        StaffUser $teacher,
        string $purpose,
        bool $isActive,
    ): Learner {
        return Learner::query()->create([
            'learner_code' => $learnerCode,
            'account_purpose' => $purpose,
            'password' => 'local-test-password',
            'first_name' => 'Test',
            'middle_name' => '',
            'last_name' => $learnerCode,
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'A',
            'is_active' => $isActive,
        ]);
    }
}
