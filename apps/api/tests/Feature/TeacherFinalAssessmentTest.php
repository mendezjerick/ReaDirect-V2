<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class TeacherFinalAssessmentTest extends TestCase
{
    public function test_teacher_reviews_final_readiness_and_latest_persisted_results(): void
    {
        $teacher = $this->createTeacher();
        $notReady = $this->createLearner($teacher, 'AA030', 'Alice', 'Maple', 'Reader');
        $ready = $this->createLearner($teacher, 'AA031', 'Dorothy', 'Gale', 'Wright');
        $active = $this->createLearner($teacher, 'AA032', 'Matilda', 'Book', 'Worm');
        $completed = $this->createLearner($teacher, 'AA033', 'Zelda', 'Final', 'Reader');

        LearnerProgressState::query()->create([
            'learner_id' => $notReady->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 4,
            'diagnostic_completed_at' => now()->subDays(5),
            'last_confirmed_at' => now()->subDay(),
        ]);
        foreach ([$ready, $active] as $learner) {
            LearnerProgressState::query()->create([
                'learner_id' => $learner->id,
                'stage' => LearnerProgressState::FINAL_ASSESSMENT_STAGE,
                'diagnostic_completed_at' => now()->subDays(5),
                'last_confirmed_at' => now()->subHour(),
            ]);
        }
        LearnerProgressState::query()->create([
            'learner_id' => $completed->id,
            'stage' => LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
            'diagnostic_completed_at' => now()->subDays(5),
            'final_assessment_completed_at' => now(),
            'last_confirmed_at' => now(),
        ]);

        $this->createAssessmentRun(
            $active,
            AssessmentRun::TYPE_FINAL,
            AssessmentRun::STATUS_ACTIVE,
            'Grade Ready',
            null,
        );
        $this->createAssessmentRun(
            $completed,
            AssessmentRun::TYPE_DIAGNOSTIC,
            AssessmentRun::STATUS_COMPLETED,
            'Moderate Refresher',
            'Developing Reader',
        );
        $this->createAssessmentRun(
            $completed,
            AssessmentRun::TYPE_FINAL,
            AssessmentRun::STATUS_COMPLETED,
            'Light Refresher',
            'Transitioning Reader',
        );
        $latestCompletedRun = $this->createAssessmentRun(
            $completed,
            AssessmentRun::TYPE_FINAL,
            AssessmentRun::STATUS_COMPLETED,
            'Grade Ready',
            'Reading at Grade Level',
        );
        AssessmentResponse::query()->create([
            'assessment_run_id' => $latestCompletedRun->id,
            'task_key' => 'task-3b',
            'item_key' => 'choice-1',
            'item_order' => 1,
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'score' => 0,
        ]);

        $response = $this->getJson(
            "/api/staff/teacher/{$teacher->id}/assessments/final",
        );

        $response
            ->assertOk()
            ->assertJsonPath('assessment_type', AssessmentRun::TYPE_FINAL)
            ->assertJsonPath('metrics.total_learners', 4)
            ->assertJsonPath('metrics.not_ready', 1)
            ->assertJsonPath('metrics.ready', 1)
            ->assertJsonPath('metrics.in_progress', 1)
            ->assertJsonPath('metrics.completed', 1)
            ->assertJsonPath('metrics.with_skipped_items', 1)
            ->assertJsonPath('learners.0.status', 'not_ready')
            ->assertJsonPath('learners.1.status', 'ready')
            ->assertJsonPath('learners.2.status', 'in_progress')
            ->assertJsonPath('learners.3.status', 'completed')
            ->assertJsonPath('learners.3.part_one_level', 'Grade Ready')
            ->assertJsonPath('learners.3.final_reading_profile', 'Reading at Grade Level')
            ->assertJsonPath('learners.3.skipped_items_count', 1);
    }

    public function test_final_review_excludes_other_teachers_and_portal_system_learners(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-final-teacher',
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
            'AA034',
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
        foreach ([$otherLearner, $portalLearner] as $learner) {
            $this->createAssessmentRun(
                $learner,
                AssessmentRun::TYPE_FINAL,
                AssessmentRun::STATUS_COMPLETED,
                'Grade Ready',
                'Reading at Grade Level',
            );
        }

        $response = $this->getJson(
            "/api/staff/teacher/{$teacher->id}/assessments/final",
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
            'username' => 'final-teacher',
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

    private function createAssessmentRun(
        Learner $learner,
        string $assessmentType,
        string $status,
        ?string $partOneLevel,
        ?string $readingProfile,
    ): AssessmentRun {
        $completed = $status === AssessmentRun::STATUS_COMPLETED;

        return AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => $assessmentType,
            'content_version' => 'v1',
            'status' => $status,
            'stage' => $completed ? 'assessment-complete' : 'part-2',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'part_one_score' => $partOneLevel === null ? null : 30,
            'part_one_level' => $partOneLevel,
            'reading_accuracy_percent' => $readingProfile === null ? null : 95,
            'comprehension_score' => $readingProfile === null ? null : 5,
            'comprehension_percent' => $readingProfile === null ? null : 100,
            'final_reading_score' => $readingProfile === null ? null : 97,
            'final_reading_profile' => $readingProfile,
            'part_one_completed_at' => $partOneLevel === null ? null : now(),
            'part_two_completed_at' => $completed ? now() : null,
            'assessment_completed_at' => $completed ? now() : null,
        ]);
    }
}
