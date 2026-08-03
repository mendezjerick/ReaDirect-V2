<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminOverviewDataTest extends TestCase
{
    public function test_overview_uses_persisted_school_scoped_assessment_data(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $northTeacher = $this->teacher('north-teacher', $northfield);
        $southTeacher = $this->teacher('south-teacher', $southfield);
        $northLearner = $this->learner('AA250', $northfield, $northTeacher);
        $southLearner = $this->learner('AA251', $southfield, $southTeacher);
        $northRun = $this->diagnostic($northLearner, 'Grade Ready');
        $this->diagnostic($southLearner, 'Full Refresher');

        $this->getJson("/api/staff/school-admin/{$administrator->id}/overview")
            ->assertOk()
            ->assertJsonPath('metrics.total_teachers', 1)
            ->assertJsonPath('metrics.total_learners', 1)
            ->assertJsonPath('part_one_distribution.3.label', 'Grade Ready')
            ->assertJsonPath('part_one_distribution.3.value', 1)
            ->assertJsonCount(1, 'recent_assessment_activity')
            ->assertJsonPath('recent_assessment_activity.0.completion_mode', 'standard')
            ->assertJsonPath(
                'recent_assessment_activity.0.learner_code',
                'AA250',
            )
            ->assertJsonMissing(['learner_code' => 'AA251']);

        $this->assertDatabaseHas('assessment_runs', [
            'id' => $northRun->id,
            'part_one_level' => 'Grade Ready',
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

    private function diagnostic(
        Learner $learner,
        string $level,
    ): AssessmentRun {
        return AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'completed',
            'content_snapshot' => [],
            'part_one_level' => $level,
            'final_reading_score' => 82,
            'final_reading_profile' => 'Developing Reader',
            'assessment_completed_at' => now(),
        ]);
    }
}
