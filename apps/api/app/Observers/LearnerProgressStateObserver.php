<?php

namespace App\Observers;

use App\Enums\StaffRealtimeTopic;
use App\Models\LearnerProgressState;
use App\Services\StaffRealtimePublisher;

final class LearnerProgressStateObserver
{
    public function __construct(
        private readonly StaffRealtimePublisher $realtime,
    ) {}

    public function created(LearnerProgressState $progress): void
    {
        $this->publish($progress);
    }

    public function updated(LearnerProgressState $progress): void
    {
        if (! $progress->wasChanged([
            'stage',
            'current_required_lesson_order',
            'diagnostic_completed_at',
            'final_assessment_completed_at',
            'last_confirmed_at',
        ])) {
            return;
        }

        $this->publish($progress);
    }

    private function publish(LearnerProgressState $progress): void
    {
        $this->realtime->learner(
            $progress->learner()->firstOrFail(),
            StaffRealtimeTopic::Overview,
            StaffRealtimeTopic::Learners,
            StaffRealtimeTopic::LearnerDetail,
            StaffRealtimeTopic::Analytics,
            StaffRealtimeTopic::Reports,
            StaffRealtimeTopic::InstructionalInsights,
            StaffRealtimeTopic::AssessmentReviews,
        );
    }
}
