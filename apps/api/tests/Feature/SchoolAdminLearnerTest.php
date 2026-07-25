<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminLearnerTest extends TestCase
{
    public function test_directory_and_detail_are_read_only_and_school_scoped(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $northTeacher = $this->teacher('north-teacher', $northfield);
        $southTeacher = $this->teacher('south-teacher', $southfield);
        $northLearner = $this->learner('AA220', $northfield, $northTeacher);
        $southLearner = $this->learner('AA221', $southfield, $southTeacher);
        $progress = LearnerProgressState::query()->create([
            'learner_id' => $northLearner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 2,
        ]);
        Learner::query()->create([
            'learner_code' => 'KW000',
            'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
            'password' => 'portal-password',
            'first_name' => 'Kristen',
            'middle_name' => 'Rhine',
            'last_name' => 'Wright',
        ]);

        $this->getJson("/api/staff/school-admin/{$administrator->id}/learners")
            ->assertOk()
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.learner_code', 'AA220')
            ->assertJsonPath('learners.0.teacher.username', 'north-teacher')
            ->assertJsonMissing(['learner_code' => 'KW000'])
            ->assertJsonMissing(['learner_code' => 'AA221']);

        $this->getJson(
            "/api/staff/school-admin/{$administrator->id}/learners/{$northLearner->id}",
        )
            ->assertOk()
            ->assertJsonPath('learner.learner_code', 'AA220')
            ->assertJsonPath('progression.stage', 'required_lessons')
            ->assertJsonPath('class_context.teacher.username', 'north-teacher')
            ->assertJsonMissingPath('learner.password')
            ->assertJsonMissingPath('learner.raw_transcript')
            ->assertJsonMissingPath('learner.audio_path');

        $this->getJson(
            "/api/staff/school-admin/{$administrator->id}/learners/{$southLearner->id}",
        )->assertNotFound();

        $this->assertDatabaseHas('learner_progress_states', [
            'id' => $progress->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 2,
        ]);
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
