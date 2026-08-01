<?php

namespace App\Http\Controllers;

use App\Enums\StaffRealtimeTopic;
use App\Models\AssessmentResponse;
use App\Models\StaffAuditLog;
use App\Models\StaffResponseReview;
use App\Models\StaffUser;
use App\Services\StaffRealtimePublisher;
use App\Services\TeacherAudioReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TeacherAudioReviewController extends Controller
{
    public function index(
        StaffUser $staffUser,
        TeacherAudioReviewService $reviews,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);

        return response()->json($reviews->build($staffUser));
    }

    public function audio(
        StaffUser $staffUser,
        string $responseKind,
        int $responseId,
        TeacherAudioReviewService $reviews,
    ): BinaryFileResponse {
        $this->assertReadyTeacher($staffUser);
        $response = $reviews->resolve($staffUser, $responseKind, $responseId);
        $path = (string) $response->audio_path;
        $disk = Storage::disk('local');

        if (! $disk->exists($path)) {
            abort(404);
        }

        $fileResponse = response()->file($disk->path($path), [
            'Content-Type' => $disk->mimeType($path) ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
        ]);
        $fileResponse->setPrivate();
        $fileResponse->headers->addCacheControlDirective('no-store');

        return $fileResponse;
    }

    public function store(
        Request $request,
        StaffUser $staffUser,
        string $responseKind,
        int $responseId,
        TeacherAudioReviewService $reviews,
        StaffRealtimePublisher $realtime,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);
        $validated = $request->validate([
            'reviewed_transcript' => ['required', 'string', 'max:500'],
            'reviewed_decision' => ['required', 'in:CORRECT,INCORRECT,UNSCORABLE,SKIPPED'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $response = $reviews->resolve($staffUser, $responseKind, $responseId);
        $learnerId = $response->run->learner_id;
        $originalTranscript = $response instanceof AssessmentResponse
            ? $response->scoring_transcript
            : $response->final_transcript;

        $review = StaffResponseReview::query()->create([
            'learner_id' => $learnerId,
            'reviewed_by_staff_user_id' => $staffUser->id,
            'response_kind' => $responseKind,
            'response_id' => $response->id,
            'original_transcript' => $originalTranscript,
            'original_decision' => $response->decision,
            ...$validated,
        ]);

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => 'learner.response_reviewed',
            'description' => "Recorded a staff-only review for {$responseKind} response {$response->id}.",
            'metadata' => [
                'learner_id' => $learnerId,
                'response_kind' => $responseKind,
                'response_id' => $response->id,
                'staff_response_review_id' => $review->id,
                'canonical_records_changed' => false,
            ],
        ]);

        $realtime->teacher(
            $staffUser->id,
            $staffUser->school_id,
            StaffRealtimeTopic::AudioReviews,
            StaffRealtimeTopic::LearnerDetail,
            StaffRealtimeTopic::Analytics,
            StaffRealtimeTopic::Reports,
            StaffRealtimeTopic::Operations,
        );

        return response()->json([
            'review' => $reviews->serializeReview($review),
            'canonical_records_changed' => false,
        ], 201);
    }

    private function assertReadyTeacher(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'teacher' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null || $staffUser->grade_level === null || $staffUser->section === null) {
            throw new HttpException(409, 'A complete class assignment is required before reviewing audio.');
        }
    }
}
