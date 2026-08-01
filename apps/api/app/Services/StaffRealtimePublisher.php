<?php

namespace App\Services;

use App\Enums\StaffRealtimeTopic;
use App\Events\StaffDataChanged;
use App\Models\Learner;
use Illuminate\Support\Str;

final class StaffRealtimePublisher
{
    public function system(StaffRealtimeTopic ...$topics): void
    {
        $this->dispatch(['staff.system'], $topics);
    }

    public function school(int $schoolId, StaffRealtimeTopic ...$topics): void
    {
        $this->dispatch([
            'staff.system',
            "schools.{$schoolId}",
        ], $topics);
    }

    public function teacher(
        int $teacherId,
        ?int $schoolId,
        StaffRealtimeTopic ...$topics,
    ): void {
        $channels = [
            'staff.system',
            "teachers.{$teacherId}",
        ];

        if ($schoolId !== null) {
            $channels[] = "schools.{$schoolId}";
        }

        $this->dispatch($channels, $topics);
    }

    public function learner(Learner $learner, StaffRealtimeTopic ...$topics): void
    {
        if ($learner->teacher_id !== null) {
            $this->teacher(
                $learner->teacher_id,
                $learner->school_id,
                ...$topics,
            );

            return;
        }

        if ($learner->school_id !== null) {
            $this->school($learner->school_id, ...$topics);

            return;
        }

        $this->system(...$topics);
    }

    /**
     * @param  array<int, string>  $channels
     * @param  array<int, StaffRealtimeTopic>  $topics
     */
    private function dispatch(array $channels, array $topics): void
    {
        $channelNames = array_values(array_unique($channels));
        $topicNames = array_values(array_unique(array_map(
            static fn (StaffRealtimeTopic $topic): string => $topic->value,
            $topics,
        )));

        if ($topicNames === []) {
            return;
        }

        StaffDataChanged::dispatch(
            $channelNames,
            $topicNames,
            (string) Str::uuid(),
            now()->toIso8601String(),
        );
    }
}
