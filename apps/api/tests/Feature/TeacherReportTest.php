<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\School;
use App\Models\StaffUser;
use Tests\TestCase;

final class TeacherReportTest extends TestCase
{
    public function test_report_uses_only_persisted_evidence_for_assigned_standard_learners(): void
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);
        $teacher = StaffUser::query()->create([
            'username' => 'report-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'display_name' => 'Teacher',
            'is_active' => true,
        ]);
        $this->authenticateStaff($teacher);
        $learner = Learner::query()->create([
            'learner_code' => 'AA000',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'learner-pass',
            'first_name' => 'Dorothy',
            'middle_name' => 'Gale',
            'last_name' => 'Wright',
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 3,
            'diagnostic_completed_at' => now()->subDay(),
        ]);
        $diagnostic = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'completed',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'final_reading_score' => 81,
            'final_reading_profile' => 'Transitioning Reader',
            'assessment_completed_at' => now()->subDay(),
        ]);
        AssessmentResponse::query()->create([
            'assessment_run_id' => $diagnostic->id,
            'task_key' => 'task-1a',
            'item_key' => 'task-1a-01',
            'item_order' => 1,
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'score' => 0,
        ]);
        foreach ([1, 2] as $order) {
            $run = LessonRun::query()->create([
                'learner_id' => $learner->id,
                'lesson_key' => "required-lesson-{$order}",
                'content_version' => 'v1',
                'status' => LessonRun::STATUS_COMPLETED,
                'mission_key' => 'mission-1',
                'current_item_index' => 0,
                'content_snapshot' => [],
                'completed_at' => now(),
            ]);
            if ($order === 2) {
                LessonResponse::query()->create([
                    'lesson_run_id' => $run->id,
                    'mission_key' => 'mission-1',
                    'item_key' => 'item-1',
                    'item_order' => 1,
                    'response_type' => 'speech',
                    'decision' => 'CORRECT',
                    'review_recommended' => true,
                ]);
            }
        }
        Learner::query()->create([
            'learner_code' => 'KW000',
            'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
            'password' => 'portal-pass',
            'first_name' => 'Kristen',
            'middle_name' => 'Rhine',
            'last_name' => 'Wright',
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'is_active' => true,
        ]);

        $before = [
            'progress' => LearnerProgressState::query()->count(),
            'assessments' => AssessmentRun::query()->count(),
            'lessons' => LessonRun::query()->count(),
        ];
        $response = $this->getJson("/api/staff/teacher/{$teacher->id}/reports");

        $response
            ->assertOk()
            ->assertJsonPath('class_context.school.name', 'Northfield Elementary School')
            ->assertJsonPath('summary.learners', 1)
            ->assertJsonPath('summary.diagnostic_complete', 1)
            ->assertJsonPath('summary.with_review_evidence', 1)
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.learner_code', 'AA000')
            ->assertJsonPath(
                'learners.0.stage_label',
                'Reading lessons · 2 of 6 complete',
            )
            ->assertJsonPath('learners.0.diagnostic.score', 81)
            ->assertJsonPath('learners.0.required_lessons_completed', 2)
            ->assertJsonPath('learners.0.final.status', 'not_started')
            ->assertJsonPath('learners.0.skipped_items', 1)
            ->assertJsonPath('learners.0.review_recommended_items', 1);

        $this->assertSame($before['progress'], LearnerProgressState::query()->count());
        $this->assertSame($before['assessments'], AssessmentRun::query()->count());
        $this->assertSame($before['lessons'], LessonRun::query()->count());
        $this->assertStringNotContainsString('KW000', $response->getContent());
    }
}
