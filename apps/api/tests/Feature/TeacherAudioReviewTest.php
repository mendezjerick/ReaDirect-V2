<?php

namespace Tests\Feature;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\School;
use App\Models\StaffResponseReview;
use App\Models\StaffUser;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class TeacherAudioReviewTest extends TestCase
{
    public function test_teacher_streams_assigned_audio_and_records_a_separate_review_without_changing_canonical_evidence(): void
    {
        Storage::fake('local');
        [$teacher, $learner] = $this->createTeacherAndLearner();
        $run = AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_COMPLETED,
            'stage' => 'completed',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'final_reading_score' => 80,
            'assessment_completed_at' => now(),
        ]);
        $path = 'learner-recordings/assigned.webm';
        Storage::disk('local')->put($path, 'learner-audio-bytes');
        $responseRecord = AssessmentResponse::query()->create([
            'assessment_run_id' => $run->id,
            'task_key' => 'task-3a',
            'item_key' => 'passage-1',
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'private raw guess',
            'scoring_transcript' => 'the learner said bat',
            'decision' => 'INCORRECT',
            'score' => 0,
            'audio_path' => $path,
            'audio_sha256' => hash('sha256', 'learner-audio-bytes'),
            'evidence' => ['private' => 'classifier details'],
        ]);
        $originalUpdatedAt = $responseRecord->updated_at;

        $index = $this->getJson("/api/staff/teacher/{$teacher->id}/audio-reviews");
        $index
            ->assertOk()
            ->assertJsonPath('summary.recordings', 1)
            ->assertJsonPath('summary.reviewed', 0)
            ->assertJsonPath('items.0.learner.learner_code', 'AA000')
            ->assertJsonPath('items.0.original_transcript', 'the learner said bat')
            ->assertJsonPath('items.0.original_decision', 'INCORRECT')
            ->assertJsonPath('items.0.latest_review', null);
        $this->assertStringNotContainsString('private raw guess', $index->getContent());
        $this->assertStringNotContainsString($path, $index->getContent());
        $this->assertStringNotContainsString('classifier details', $index->getContent());

        $audioResponse = $this->get(
            "/api/staff/teacher/{$teacher->id}/audio-reviews/assessment/{$responseRecord->id}/audio",
        );
        $audioResponse->assertOk();
        $this->assertSame(
            'learner-audio-bytes',
            file_get_contents($audioResponse->baseResponse->getFile()->getPathname()),
        );
        $cacheControl = (string) $audioResponse->headers->get('cache-control');
        $this->assertStringContainsString('private', $cacheControl);
        $this->assertStringContainsString('no-store', $cacheControl);

        $reviewResponse = $this->postJson(
            "/api/staff/teacher/{$teacher->id}/audio-reviews/assessment/{$responseRecord->id}",
            [
                'reviewed_transcript' => 'the learner said bag',
                'reviewed_decision' => 'CORRECT',
                'notes' => 'Confirmed from the saved recording.',
            ],
        );
        $reviewResponse
            ->assertCreated()
            ->assertJsonPath('review.reviewed_transcript', 'the learner said bag')
            ->assertJsonPath('review.reviewed_decision', 'CORRECT')
            ->assertJsonPath('canonical_records_changed', false);

        $responseRecord->refresh();
        $this->assertSame('private raw guess', $responseRecord->raw_transcript);
        $this->assertSame('the learner said bat', $responseRecord->scoring_transcript);
        $this->assertSame('INCORRECT', $responseRecord->decision);
        $this->assertSame(0, $responseRecord->score);
        $this->assertTrue($responseRecord->updated_at->equalTo($originalUpdatedAt));
        $this->assertSame(80, $run->refresh()->final_reading_score);
        $this->assertDatabaseCount('staff_response_reviews', 1);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $teacher->id,
            'action_key' => 'learner.response_reviewed',
        ]);

        $review = StaffResponseReview::query()->firstOrFail();
        $this->assertSame('the learner said bat', $review->original_transcript);
        $this->assertSame('INCORRECT', $review->original_decision);

        $this->getJson("/api/staff/teacher/{$teacher->id}/audio-reviews")
            ->assertJsonPath('summary.reviewed', 1)
            ->assertJsonPath('items.0.latest_review.reviewed_decision', 'CORRECT');
    }

    public function test_teacher_cannot_review_or_stream_another_teachers_recording(): void
    {
        Storage::fake('local');
        [$teacher] = $this->createTeacherAndLearner();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-audio-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 1,
            'section' => 'Rose',
            'display_name' => 'Other Teacher',
            'is_active' => true,
        ]);
        $otherLearner = Learner::query()->create([
            'learner_code' => 'AA001',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'learner-pass',
            'first_name' => 'Other',
            'middle_name' => 'Class',
            'last_name' => 'Learner',
            'school_id' => $teacher->school_id,
            'teacher_id' => $otherTeacher->id,
            'grade_level' => 1,
            'section' => 'Rose',
            'is_active' => true,
        ]);
        $run = AssessmentRun::query()->create([
            'learner_id' => $otherLearner->id,
            'assessment_type' => AssessmentRun::TYPE_DIAGNOSTIC,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_ACTIVE,
            'stage' => 'part_one',
            'current_item_index' => 0,
            'content_snapshot' => [],
        ]);
        $path = 'learner-recordings/other.webm';
        Storage::disk('local')->put($path, 'other-audio');
        $response = AssessmentResponse::query()->create([
            'assessment_run_id' => $run->id,
            'task_key' => 'task-1a',
            'item_key' => 'item-1',
            'item_order' => 1,
            'response_type' => 'speech',
            'scoring_transcript' => 'A',
            'decision' => 'CORRECT',
            'score' => 1,
            'audio_path' => $path,
        ]);

        $this->get(
            "/api/staff/teacher/{$teacher->id}/audio-reviews/assessment/{$response->id}/audio",
        )->assertNotFound();
        $this->postJson(
            "/api/staff/teacher/{$teacher->id}/audio-reviews/assessment/{$response->id}",
            [
                'reviewed_transcript' => 'B',
                'reviewed_decision' => 'INCORRECT',
            ],
        )->assertNotFound();
        $this->assertDatabaseCount('staff_response_reviews', 0);
    }

    /** @return array{StaffUser, Learner} */
    private function createTeacherAndLearner(): array
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);
        $teacher = StaffUser::query()->create([
            'username' => 'audio-review-teacher',
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

        return [$teacher, $learner];
    }
}
