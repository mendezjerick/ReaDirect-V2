<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SystemAdminLearnerDirectoryTest extends TestCase
{
    public function test_system_administrator_can_view_standard_learner_directory_truth(): void
    {
        $systemAdministrator = $this->staffUser('system-admin', 'system_admin');
        $this->authenticateStaff($systemAdministrator);

        $alphaSchool = $this->school('Alpha Elementary');
        $bravoSchool = $this->school('Bravo Elementary');
        $alphaTeacher = $this->staffUser('alpha-teacher', 'teacher', $alphaSchool);

        $alphaLearner = $this->learner(
            'AA001',
            'Ana',
            'Santos',
            $alphaSchool,
            $alphaTeacher,
            Learner::PURPOSE_STANDARD,
            true,
        );
        $bravoLearner = $this->learner(
            'BB001',
            'Ben',
            'Reyes',
            $bravoSchool,
            null,
            Learner::PURPOSE_STANDARD,
            false,
        );
        $portalLearner = $this->learner(
            'KW000',
            'Kristen',
            'Wright',
            $alphaSchool,
            $alphaTeacher,
            Learner::PURPOSE_PORTAL_SYSTEM,
            true,
        );

        LearnerProgressState::query()->create([
            'learner_id' => $alphaLearner->id,
            'stage' => 'required-lesson-3',
            'current_required_lesson_order' => 3,
            'diagnostic_completed_at' => now()->subDay(),
            'last_confirmed_at' => now()->subHour(),
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $bravoLearner->id,
            'stage' => LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
            'diagnostic_completed_at' => now()->subDays(2),
            'final_assessment_completed_at' => now()->subDay(),
            'last_confirmed_at' => now()->subDay(),
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $portalLearner->id,
            'stage' => LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
            'diagnostic_completed_at' => now(),
            'final_assessment_completed_at' => now(),
        ]);

        $this->getJson('/api/staff/system-admin/learners')
            ->assertOk()
            ->assertJsonPath('summary.total_learners', 2)
            ->assertJsonPath('summary.active_learners', 1)
            ->assertJsonPath('summary.diagnostic_completed', 2)
            ->assertJsonPath('summary.final_assessment_completed', 1)
            ->assertJsonPath('summary.without_teacher', 1)
            ->assertJsonPath('summary.schools_represented', 2)
            ->assertJsonPath('learners.0.learner_code', 'AA001')
            ->assertJsonPath('learners.0.full_name', 'Ana Santos')
            ->assertJsonPath('learners.0.school.name', 'Alpha Elementary')
            ->assertJsonPath('learners.0.teacher.username', 'alpha-teacher')
            ->assertJsonPath('learners.0.progress.stage', 'required-lesson-3')
            ->assertJsonPath('learners.0.progress.current_required_lesson_order', 3)
            ->assertJsonPath('learners.0.progress.diagnostic_completed', true)
            ->assertJsonPath('learners.0.progress.final_assessment_completed', false)
            ->assertJsonPath('learners.0.reading_path.completed_lesson_count', 0)
            ->assertJsonPath('learners.0.reading_path.final_assessment.status', 'locked')
            ->assertJsonPath('learners.1.learner_code', 'BB001')
            ->assertJsonPath('learners.1.is_active', false)
            ->assertJsonPath('learners.1.teacher', null)
            ->assertJsonPath(
                'learners.1.progress.stage',
                LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
            )
            ->assertJsonCount(2, 'learners')
            ->assertJsonMissing(['learner_code' => 'KW000'])
            ->assertJsonStructure([
                'summary',
                'learners' => [
                    '*' => [
                        'id',
                        'learner_code',
                        'full_name',
                        'is_active',
                        'school',
                        'teacher',
                        'grade_level',
                        'section',
                        'progress' => [
                            'stage',
                            'current_required_lesson_order',
                            'diagnostic_completed',
                            'final_assessment_completed',
                            'last_confirmed_at',
                        ],
                        'reading_path',
                        'created_at',
                    ],
                ],
                'generated_at',
            ]);
    }

    public function test_learner_directory_is_restricted_to_system_administrators(): void
    {
        $school = $this->school('Northfield Elementary');
        $schoolAdministrator = $this->staffUser(
            'northfield-admin',
            'school_admin',
            $school,
        );
        $this->authenticateStaff($schoolAdministrator);

        $this->getJson('/api/staff/system-admin/learners')->assertForbidden();
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
    ): StaffUser {
        return StaffUser::query()->create([
            'username' => $username,
            'password' => 'local-test-password',
            'role' => $role,
            'school_id' => $school?->id,
            'grade_level' => $role === 'teacher' ? 2 : null,
            'section' => $role === 'teacher' ? 'Maple' : null,
            'display_name' => $role === 'teacher' ? 'Teacher' : 'Administrator',
            'is_active' => true,
        ]);
    }

    private function learner(
        string $learnerCode,
        string $firstName,
        string $lastName,
        School $school,
        ?StaffUser $teacher,
        string $purpose,
        bool $isActive,
    ): Learner {
        return Learner::query()->create([
            'learner_code' => $learnerCode,
            'account_purpose' => $purpose,
            'password' => 'local-test-password',
            'first_name' => $firstName,
            'middle_name' => '',
            'last_name' => $lastName,
            'school_id' => $school->id,
            'teacher_id' => $teacher?->id,
            'grade_level' => 2,
            'section' => 'Maple',
            'is_active' => $isActive,
        ]);
    }
}
