<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolAdminInstructionalInsightsTest extends TestCase
{
    public function test_insights_are_deterministic_read_only_and_school_scoped(): void
    {
        $northfield = $this->school('Northfield Elementary School');
        $southfield = $this->school('Southfield Elementary School');
        $administrator = $this->administrator($northfield);
        $northTeacher = $this->teacher('north-teacher', $northfield);
        $southTeacher = $this->teacher('south-teacher', $southfield);
        $northLearner = $this->learner('AA230', $northfield, $northTeacher);
        $skippedDiagnosticLearner = $this->learner(
            'AA232',
            $northfield,
            $northTeacher,
        );
        $southLearner = $this->learner('AA231', $southfield, $southTeacher);
        $portalLearner = $this->learner(
            'KW000',
            $northfield,
            $northTeacher,
            Learner::PURPOSE_PORTAL_SYSTEM,
        );

        $diagnostic = $this->assessment($northLearner);
        $this->assessment($skippedDiagnosticLearner)->forceFill([
            'completion_mode' => AssessmentRun::COMPLETION_MODE_SKIPPED,
        ])->save();
        $this->assessmentSkip($diagnostic, 'task-1a', 'letter-a');
        $this->assessmentSkip($diagnostic, 'task-2b', 'word-cat');
        $this->assessmentSkip(
            $this->assessment($southLearner),
            'task-3b',
            'south-comprehension',
        );
        $this->assessmentSkip(
            $this->assessment($portalLearner),
            'task-3a',
            'portal-passage',
        );

        $letterLesson = $this->lesson($northLearner, 'required-lesson-1');
        LessonResponse::query()->create([
            'lesson_run_id' => $letterLesson->id,
            'mission_key' => 'mission-1',
            'item_key' => 'letter-b',
            'item_order' => 1,
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'outcome' => 'SKIPPED',
            'review_recommended' => true,
            'raw_transcript' => 'private skipped transcript',
        ]);
        $wordLesson = $this->lesson($northLearner, 'required-lesson-2');
        LessonResponse::query()->create([
            'lesson_run_id' => $wordLesson->id,
            'mission_key' => 'mission-1',
            'item_key' => 'word-dog',
            'item_order' => 1,
            'response_type' => 'speech',
            'decision' => 'INCORRECT',
            'outcome' => 'SUPPORTED_CORRECT',
            'review_recommended' => true,
            'final_transcript' => 'private corrected transcript',
        ]);

        $response = $this->getJson(
            "/api/staff/school-admin/{$administrator->id}/instructional-insights",
        );

        $response
            ->assertOk()
            ->assertJsonPath('school.name', 'Northfield Elementary School')
            ->assertJsonPath('read_only', true)
            ->assertJsonPath('rules_version', 'school-instructional-insights-v1')
            ->assertJsonPath('summary.active_learners', 2)
            ->assertJsonPath('summary.learners_with_evidence', 1)
            ->assertJsonPath('summary.assessment_skips', 2)
            ->assertJsonPath('summary.whole_diagnostic_skips', 1)
            ->assertJsonPath('summary.lesson_skips', 1)
            ->assertJsonPath('summary.review_recommended_items', 1)
            ->assertJsonPath('summary.teaching_priorities', 2)
            ->assertJsonPath(
                'priorities.0.title',
                'Teach letter names and sounds face-to-face',
            )
            ->assertJsonPath('priorities.0.assessment_skips', 1)
            ->assertJsonPath('priorities.0.lesson_skips', 1)
            ->assertJsonPath(
                'priorities.1.title',
                'Teach word reading face-to-face',
            )
            ->assertJsonPath('assessment_breakdown.0.diagnostic_skips', 1)
            ->assertJsonPath('lesson_breakdown.0.skipped_items', 1)
            ->assertJsonPath('lesson_breakdown.1.review_recommended_items', 1)
            ->assertJsonPath('class_breakdown.0.teacher.username', 'north-teacher')
            ->assertJsonPath('class_breakdown.0.evidence_items', 4);

        $content = $response->getContent();
        $this->assertStringNotContainsString('AA231', $content);
        $this->assertStringNotContainsString('KW000', $content);
        $this->assertStringNotContainsString('south-comprehension', $content);
        $this->assertStringNotContainsString('portal-passage', $content);
        $this->assertStringNotContainsString('private skipped transcript', $content);
        $this->assertStringNotContainsString('private corrected transcript', $content);
        $this->assertDatabaseCount('staff_audit_logs', 0);
        $this->assertDatabaseCount('assessment_responses', 4);
        $this->assertDatabaseCount('lesson_responses', 2);
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
        string $purpose = Learner::PURPOSE_STANDARD,
    ): Learner {
        return Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => $purpose,
            'password' => 'apple123',
            'first_name' => 'Dorothy',
            'middle_name' => 'Gale',
            'last_name' => 'Wright',
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 3,
            'section' => 'Maple',
            'is_active' => true,
        ]);
    }

    private function assessment(Learner $learner): AssessmentRun
    {
        return AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'completed',
            'content_snapshot' => [],
            'assessment_completed_at' => now(),
        ]);
    }

    private function assessmentSkip(
        AssessmentRun $run,
        string $taskKey,
        string $itemKey,
    ): void {
        AssessmentResponse::query()->create([
            'assessment_run_id' => $run->id,
            'task_key' => $taskKey,
            'item_key' => $itemKey,
            'item_order' => 1,
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'score' => 0,
        ]);
    }

    private function lesson(Learner $learner, string $lessonKey): LessonRun
    {
        return LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => $lessonKey,
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_COMPLETED,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'completed_at' => now(),
        ]);
    }
}
