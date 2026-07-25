<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class TeacherDiagnosticAssessmentTest extends TestCase
{
    public function test_teacher_reviews_latest_diagnostic_results_for_assigned_standard_learners(): void
    {
        $teacher = $this->createTeacher();
        $alice = $this->createLearner($teacher, 'AA020', 'Alice', 'Maple', 'Reader');
        $dorothy = $this->createLearner($teacher, 'AA021', 'Dorothy', 'Gale', 'Wright');
        $matilda = $this->createLearner($teacher, 'AA022', 'Matilda', 'Book', 'Worm');

        $this->createDiagnosticRun(
            $dorothy,
            AssessmentRun::STATUS_COMPLETED,
            'Moderate Refresher',
            'Developing Reader',
        );
        $latestDorothyRun = $this->createDiagnosticRun(
            $dorothy,
            AssessmentRun::STATUS_COMPLETED,
            'Light Refresher',
            'Transitioning Reader',
        );
        AssessmentResponse::query()->create([
            'assessment_run_id' => $latestDorothyRun->id,
            'task_key' => 'task-2b',
            'item_key' => 'word-1',
            'item_order' => 1,
            'response_type' => 'skipped',
            'raw_transcript' => 'private raw transcript',
            'scoring_transcript' => 'private scoring transcript',
            'decision' => 'SKIPPED',
            'score' => 0,
            'audio_path' => 'private/diagnostic.wav',
            'audio_sha256' => str_repeat('a', 64),
            'evidence' => ['private' => 'service evidence'],
        ]);
        $this->createDiagnosticRun(
            $matilda,
            AssessmentRun::STATUS_ACTIVE,
            'Grade Ready',
            null,
        );

        $response = $this->getJson(
            "/api/staff/teacher/{$teacher->id}/assessments/diagnostic",
        );

        $response
            ->assertOk()
            ->assertJsonPath('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
            ->assertJsonPath('metrics.total_learners', 3)
            ->assertJsonPath('metrics.pending', 1)
            ->assertJsonPath('metrics.in_progress', 1)
            ->assertJsonPath('metrics.completed', 1)
            ->assertJsonPath('metrics.with_skipped_items', 1)
            ->assertJsonPath('learners.0.learner.id', $alice->id)
            ->assertJsonPath('learners.0.status', 'pending')
            ->assertJsonPath('learners.1.learner.id', $dorothy->id)
            ->assertJsonPath('learners.1.status', 'completed')
            ->assertJsonPath('learners.1.part_one_level', 'Light Refresher')
            ->assertJsonPath('learners.1.final_reading_profile', 'Transitioning Reader')
            ->assertJsonPath('learners.1.skipped_items_count', 1)
            ->assertJsonPath('learners.2.learner.id', $matilda->id)
            ->assertJsonPath('learners.2.status', 'in_progress');

        $body = $response->getContent();
        $this->assertStringNotContainsString('private raw transcript', $body);
        $this->assertStringNotContainsString('private scoring transcript', $body);
        $this->assertStringNotContainsString('private/diagnostic.wav', $body);
        $this->assertStringNotContainsString('service evidence', $body);
    }

    public function test_diagnostic_review_excludes_other_teachers_and_portal_system_learners(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-diagnostic-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 1,
            'section' => 'Rose',
            'display_name' => 'Other Teacher',
            'is_active' => true,
        ]);
        $otherLearner = $this->createLearner(
            $otherTeacher,
            'AA023',
            'Other',
            'Class',
            'Learner',
        );
        $portalLearner = Learner::query()->create([
            'learner_code' => 'KW000',
            'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
            'password' => 'portal-pass',
            'first_name' => 'Kristen',
            'middle_name' => 'Rhine',
            'last_name' => 'Wright',
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'is_active' => true,
        ]);

        $this->createDiagnosticRun(
            $otherLearner,
            AssessmentRun::STATUS_COMPLETED,
            'Grade Ready',
            'Reading at Grade Level',
        );
        $this->createDiagnosticRun(
            $portalLearner,
            AssessmentRun::STATUS_COMPLETED,
            'Grade Ready',
            'Reading at Grade Level',
        );

        $response = $this->getJson(
            "/api/staff/teacher/{$teacher->id}/assessments/diagnostic",
        );

        $response
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 0)
            ->assertJsonCount(0, 'learners');

        $body = $response->getContent();
        $this->assertStringNotContainsString('KW000', $body);
        $this->assertStringNotContainsString('Other Class Learner', $body);
    }

    private function createTeacher(): StaffUser
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);
        $teacher = StaffUser::query()->create([
            'username' => 'diagnostic-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'display_name' => 'Teacher',
            'is_active' => true,
        ]);
        $this->authenticateStaff($teacher);

        return $teacher;
    }

    private function createLearner(
        StaffUser $teacher,
        string $learnerCode,
        string $firstName,
        string $middleName,
        string $lastName,
    ): Learner {
        return Learner::query()->create([
            'learner_code' => $learnerCode,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'learner-pass',
            'first_name' => $firstName,
            'middle_name' => $middleName,
            'last_name' => $lastName,
            'school_id' => $teacher->school_id,
            'teacher_id' => $teacher->id,
            'grade_level' => $teacher->grade_level,
            'section' => $teacher->section,
            'is_active' => true,
        ]);
    }

    private function createDiagnosticRun(
        Learner $learner,
        string $status,
        ?string $partOneLevel,
        ?string $readingProfile,
    ): AssessmentRun {
        $completed = $status === AssessmentRun::STATUS_COMPLETED;

        return AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => $status,
            'stage' => $completed ? 'assessment-complete' : 'part-2',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'part_one_score' => $partOneLevel === null ? null : 25,
            'part_one_level' => $partOneLevel,
            'reading_accuracy_percent' => $readingProfile === null ? null : 82,
            'comprehension_score' => $readingProfile === null ? null : 4,
            'comprehension_percent' => $readingProfile === null ? null : 80,
            'final_reading_score' => $readingProfile === null ? null : 81,
            'final_reading_profile' => $readingProfile,
            'part_one_completed_at' => $partOneLevel === null ? null : now(),
            'part_two_completed_at' => $completed ? now() : null,
            'assessment_completed_at' => $completed ? now() : null,
        ]);
    }
}
