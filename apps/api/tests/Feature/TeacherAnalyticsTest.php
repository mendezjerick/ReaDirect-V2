<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\School;
use App\Models\StaffUser;
use App\Services\LessonTeachingStateMachine;
use Tests\TestCase;

final class TeacherAnalyticsTest extends TestCase
{
    public function test_analytics_aggregate_only_persisted_assigned_learner_evidence(): void
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);
        $teacher = StaffUser::query()->create([
            'username' => 'analytics-teacher',
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
        $diagnostic = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'completed',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'assessment_completed_at' => now(),
        ]);
        AssessmentResponse::query()->create([
            'assessment_run_id' => $diagnostic->id,
            'task_key' => 'task-1a',
            'item_key' => 'item-1',
            'item_order' => 1,
            'response_type' => 'skipped',
            'decision' => 'SKIPPED',
            'score' => 0,
        ]);
        $lesson = LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => 'required-lesson-2',
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_COMPLETED,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'completed_at' => now(),
        ]);
        foreach ([
            [
                'outcome' => LessonTeachingStateMachine::OUTCOME_INDEPENDENT_CORRECT,
                'diagnosis_key' => null,
                'review_recommended' => false,
                'technical_retry_count' => 0,
            ],
            [
                'outcome' => LessonTeachingStateMachine::OUTCOME_SUPPORTED_CORRECT,
                'diagnosis_key' => 'final_letter_substitution',
                'review_recommended' => true,
                'technical_retry_count' => 1,
            ],
            [
                'outcome' => LessonTeachingStateMachine::OUTCOME_UNSCORABLE_AUDIO,
                'diagnosis_key' => null,
                'review_recommended' => false,
                'technical_retry_count' => 2,
            ],
        ] as $index => $evidence) {
            LessonResponse::query()->create([
                'lesson_run_id' => $lesson->id,
                'mission_key' => 'mission-1',
                'item_key' => 'item-'.$index,
                'item_order' => $index + 1,
                'response_type' => 'speech',
                'raw_transcript' => 'private raw transcript',
                'final_transcript' => 'saved transcript',
                'decision' => $index === 2 ? 'UNSCORABLE' : 'CORRECT',
                ...$evidence,
            ]);
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

        $response = $this->getJson("/api/staff/teacher/{$teacher->id}/analytics");

        $response
            ->assertOk()
            ->assertJsonPath('cohort_size', 1)
            ->assertJsonPath('lesson_evidence.recorded_items', 3)
            ->assertJsonPath('lesson_evidence.independent_success', 1)
            ->assertJsonPath('lesson_evidence.supported_success', 1)
            ->assertJsonPath('lesson_evidence.unscorable_recordings', 1)
            ->assertJsonPath('lesson_evidence.review_recommended', 1)
            ->assertJsonPath('lesson_evidence.technical_retries', 3)
            ->assertJsonPath('assessment_skips.diagnostic', 1)
            ->assertJsonPath('assessment_skips.final', 0)
            ->assertJsonPath('lesson_breakdown.1.learners_completed', 1)
            ->assertJsonPath('lesson_breakdown.1.recorded_items', 3)
            ->assertJsonPath('diagnoses.0.diagnosis_key', 'final_letter_substitution')
            ->assertJsonPath('diagnoses.0.items', 1);

        $this->assertStringNotContainsString('private raw transcript', $response->getContent());
        $this->assertStringNotContainsString('saved transcript', $response->getContent());
        $this->assertStringNotContainsString('KW000', $response->getContent());
    }
}
