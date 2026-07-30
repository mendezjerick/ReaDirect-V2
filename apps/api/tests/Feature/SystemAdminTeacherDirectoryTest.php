<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SystemAdminTeacherDirectoryTest extends TestCase
{
    public function test_system_administrator_can_view_truthful_teacher_states(): void
    {
        $systemAdministrator = $this->staffUser('system-admin', 'system_admin');
        $this->authenticateStaff($systemAdministrator);

        $alphaSchool = $this->school('Alpha Elementary');
        $bravoSchool = $this->school('Bravo Elementary');
        $alphaTeacher = $this->staffUser(
            'alpha-teacher',
            'teacher',
            $alphaSchool,
            true,
            2,
            'Maple',
            now(),
            false,
        );
        $bravoTeacher = $this->staffUser(
            'bravo-teacher',
            'teacher',
            $bravoSchool,
            false,
            4,
            'Rizal',
            null,
            true,
        );
        $this->staffUser('unassigned-teacher', 'teacher');
        $this->staffUser('alpha-admin', 'school_admin', $alphaSchool);

        $this->learner('AA001', $alphaSchool, $alphaTeacher, Learner::PURPOSE_STANDARD, true);
        $this->learner('AA002', $alphaSchool, $alphaTeacher, Learner::PURPOSE_STANDARD, false);
        $this->learner('KW000', $alphaSchool, $alphaTeacher, Learner::PURPOSE_PORTAL_SYSTEM, true);
        $this->learner('BB001', $bravoSchool, $bravoTeacher, Learner::PURPOSE_STANDARD, true);

        $this->getJson('/api/staff/system-admin/teachers')
            ->assertOk()
            ->assertJsonPath('summary.total_teachers', 3)
            ->assertJsonPath('summary.active_teachers', 2)
            ->assertJsonPath('summary.active_standard_learners', 2)
            ->assertJsonPath('summary.pending_assignment_acknowledgements', 1)
            ->assertJsonPath('summary.incomplete_assignments', 1)
            ->assertJsonPath('summary.schools_represented', 2)
            ->assertJsonPath('teachers.0.username', 'alpha-teacher')
            ->assertJsonPath('teachers.0.school.name', 'Alpha Elementary')
            ->assertJsonPath('teachers.0.assignment_complete', true)
            ->assertJsonPath('teachers.0.requires_assignment_acknowledgement', false)
            ->assertJsonPath('teachers.0.requires_credential_setup', false)
            ->assertJsonPath('teachers.0.learners.total', 2)
            ->assertJsonPath('teachers.0.learners.active', 1)
            ->assertJsonPath('teachers.1.username', 'bravo-teacher')
            ->assertJsonPath('teachers.1.is_active', false)
            ->assertJsonPath('teachers.1.requires_assignment_acknowledgement', true)
            ->assertJsonPath('teachers.2.username', 'unassigned-teacher')
            ->assertJsonPath('teachers.2.school', null)
            ->assertJsonPath('teachers.2.assignment_complete', false)
            ->assertJsonPath('teachers.2.requires_assignment_acknowledgement', false)
            ->assertJsonStructure([
                'summary',
                'teachers' => [
                    '*' => [
                        'id',
                        'username',
                        'display_name',
                        'is_active',
                        'school',
                        'grade_level',
                        'section',
                        'assignment_complete',
                        'requires_assignment_acknowledgement',
                        'requires_credential_setup',
                        'learners' => ['total', 'active'],
                        'created_at',
                    ],
                ],
                'generated_at',
            ]);
    }

    public function test_teacher_directory_is_restricted_to_system_administrators(): void
    {
        $school = $this->school('Northfield Elementary');
        $schoolAdministrator = $this->staffUser(
            'northfield-admin',
            'school_admin',
            $school,
        );
        $this->authenticateStaff($schoolAdministrator);

        $this->getJson('/api/staff/system-admin/teachers')->assertForbidden();
    }

    private function school(string $name): School
    {
        return School::query()->create([
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
        ]);
    }

    private function staffUser(
        string $username,
        string $role,
        ?School $school = null,
        bool $isActive = true,
        ?int $gradeLevel = null,
        ?string $section = null,
        mixed $acknowledgedAt = null,
        bool $requiresCredentialSetup = false,
    ): StaffUser {
        return StaffUser::query()->create([
            'username' => $username,
            'password' => 'local-test-password',
            'role' => $role,
            'school_id' => $school?->id,
            'grade_level' => $gradeLevel,
            'section' => $section,
            'teacher_assignment_acknowledged_at' => $acknowledgedAt,
            'display_name' => $role === 'teacher' ? 'Teacher' : 'Administrator',
            'is_active' => $isActive,
            'requires_credential_setup' => $requiresCredentialSetup,
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
