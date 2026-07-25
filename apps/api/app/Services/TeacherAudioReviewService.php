<?php

namespace App\Services;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LessonResponse;
use App\Models\StaffResponseReview;
use App\Models\StaffUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

final class TeacherAudioReviewService
{
    /** @var array<string, string> */
    private const LESSON_TITLES = [
        'required-lesson-1' => 'Lesson 1 · Letter names',
        'required-lesson-2' => 'Lesson 2 · Word reading',
        'required-lesson-3' => 'Lesson 3 · Phrase reading',
        'required-lesson-4' => 'Lesson 4 · Sentence reading',
        'required-lesson-5' => 'Lesson 5 · Passage reading',
        'required-lesson-6' => 'Lesson 6 · Comprehension',
    ];

    /** @return array<string, mixed> */
    public function build(StaffUser $teacher): array
    {
        $learnerIds = $this->assignedLearnerIds($teacher);
        $assessmentResponses = $learnerIds->isEmpty()
            ? collect()
            : AssessmentResponse::query()
                ->with('run.learner')
                ->whereNotNull('audio_path')
                ->whereHas('run', fn ($query) => $query->whereIn('learner_id', $learnerIds))
                ->get();
        $lessonResponses = $learnerIds->isEmpty()
            ? collect()
            : LessonResponse::query()
                ->with('run.learner')
                ->whereNotNull('audio_path')
                ->whereHas('run', fn ($query) => $query->whereIn('learner_id', $learnerIds))
                ->get();
        $latestReviews = StaffResponseReview::query()
            ->whereIn('learner_id', $learnerIds)
            ->latest('id')
            ->get()
            ->unique(fn (StaffResponseReview $review): string => "{$review->response_kind}:{$review->response_id}")
            ->keyBy(fn (StaffResponseReview $review): string => "{$review->response_kind}:{$review->response_id}");

        $items = $assessmentResponses
            ->map(fn (AssessmentResponse $response): array => $this->serializeAssessment(
                $teacher,
                $response,
                $latestReviews->get(StaffResponseReview::KIND_ASSESSMENT.":{$response->id}"),
            ))
            ->concat(
                $lessonResponses->map(fn (LessonResponse $response): array => $this->serializeLesson(
                    $teacher,
                    $response,
                    $latestReviews->get(StaffResponseReview::KIND_LESSON.":{$response->id}"),
                )),
            )
            ->sortByDesc('occurred_at')
            ->values();

        return [
            'summary' => [
                'recordings' => $items->count(),
                'reviewed' => $items->whereNotNull('latest_review')->count(),
                'pending' => $items->whereNull('latest_review')->count(),
            ],
            'items' => $items,
        ];
    }

    public function resolve(
        StaffUser $teacher,
        string $responseKind,
        int $responseId,
    ): AssessmentResponse|LessonResponse {
        $relationScope = fn ($query) => $query
            ->whereHas('learner', fn ($learnerQuery) => $learnerQuery
                ->where('teacher_id', $teacher->id)
                ->where('account_purpose', Learner::PURPOSE_STANDARD));

        if ($responseKind === StaffResponseReview::KIND_ASSESSMENT) {
            return AssessmentResponse::query()
                ->with('run.learner')
                ->whereKey($responseId)
                ->whereNotNull('audio_path')
                ->whereHas('run', $relationScope)
                ->firstOrFail();
        }

        if ($responseKind === StaffResponseReview::KIND_LESSON) {
            return LessonResponse::query()
                ->with('run.learner')
                ->whereKey($responseId)
                ->whereNotNull('audio_path')
                ->whereHas('run', $relationScope)
                ->firstOrFail();
        }

        abort(404);
    }

    /** @return array<string, mixed> */
    public function serializeReview(StaffResponseReview $review): array
    {
        return [
            'id' => $review->id,
            'reviewed_transcript' => $review->reviewed_transcript,
            'reviewed_decision' => $review->reviewed_decision,
            'notes' => $review->notes,
            'reviewed_at' => $review->created_at?->toIso8601String(),
        ];
    }

    /** @return Collection<int, int> */
    private function assignedLearnerIds(StaffUser $teacher): Collection
    {
        return Learner::query()
            ->where('teacher_id', $teacher->id)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->pluck('id');
    }

    /** @return array<string, mixed> */
    private function serializeAssessment(
        StaffUser $teacher,
        AssessmentResponse $response,
        ?StaffResponseReview $review,
    ): array {
        $assessmentTitle = $response->run->assessment_type === AssessmentRun::TYPE_FINAL
            ? 'Final Assessment'
            : 'Diagnostic Assessment';

        return $this->item(
            $teacher,
            StaffResponseReview::KIND_ASSESSMENT,
            $response,
            $response->run->learner,
            $assessmentTitle,
            $response->task_key,
            $response->scoring_transcript,
            $response->decision,
            $response->created_at?->toIso8601String(),
            $review,
        );
    }

    /** @return array<string, mixed> */
    private function serializeLesson(
        StaffUser $teacher,
        LessonResponse $response,
        ?StaffResponseReview $review,
    ): array {
        return $this->item(
            $teacher,
            StaffResponseReview::KIND_LESSON,
            $response,
            $response->run->learner,
            self::LESSON_TITLES[$response->run->lesson_key] ?? 'Required lesson',
            $response->mission_key,
            $response->final_transcript,
            $response->decision,
            ($response->completed_at ?? $response->created_at)?->toIso8601String(),
            $review,
        );
    }

    /** @return array<string, mixed> */
    private function item(
        StaffUser $teacher,
        string $responseKind,
        Model $response,
        Learner $learner,
        string $sourceTitle,
        string $groupKey,
        ?string $transcript,
        ?string $decision,
        ?string $occurredAt,
        ?StaffResponseReview $review,
    ): array {
        return [
            'id' => "{$responseKind}:{$response->id}",
            'response_kind' => $responseKind,
            'response_id' => $response->id,
            'learner' => [
                'id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'full_name' => $this->fullName($learner),
            ],
            'source_title' => $sourceTitle,
            'group_key' => $groupKey,
            'item_key' => (string) $response->item_key,
            'original_transcript' => $transcript,
            'original_decision' => $decision,
            'occurred_at' => $occurredAt,
            'audio_url' => "/api/staff/teacher/{$teacher->id}/audio-reviews/{$responseKind}/{$response->id}/audio",
            'latest_review' => $review ? $this->serializeReview($review) : null,
        ];
    }

    private function fullName(Learner $learner): string
    {
        return implode(' ', array_filter([
            $learner->first_name,
            $learner->middle_name,
            $learner->last_name,
            $learner->suffix,
        ]));
    }
}
