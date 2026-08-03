<?php

namespace App\Services;

use App\Models\Learner;

final class LearnerFinalAssessmentAccessService
{
    public function __construct(
        private readonly LearnerLessonCompletionService $lessonCompletion,
    ) {}

    public function authorize(Learner $learner): void
    {
        abort_unless(
            $this->isAvailable($learner),
            409,
            'Complete all six lessons before starting the Final Assessment.',
        );
    }

    public function isAvailable(Learner $learner): bool
    {
        return $this->lessonCompletion->completedLessonCount($learner->id)
            === count(LearnerLessonCompletionService::REQUIRED_LESSONS);
    }
}
