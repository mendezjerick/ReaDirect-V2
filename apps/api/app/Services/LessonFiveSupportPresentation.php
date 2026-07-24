<?php

namespace App\Services;

use App\Models\LessonResponse;
use App\Models\LessonRun;

final class LessonFiveSupportPresentation extends SpokenTextLessonSupportPresentation
{
    public function __construct()
    {
        parent::__construct(5, 'lesson-v1-passage-');
    }

    public function forCurrentItem(
        LessonRun $run,
        ?LessonResponse $response,
        ?array $item,
    ): array {
        if ($run->status !== LessonRun::STATUS_REVIEW) {
            return parent::forCurrentItem($run, $response, $item);
        }

        $response = LessonResponse::query()
            ->where('lesson_run_id', $run->id)
            ->where('mission_key', 'mission-1')
            ->first();
        $accuracy = data_get(
            $response?->evidence,
            'scoring.reading_accuracy_percent',
        );
        $band = match (true) {
            $response?->response_type === 'skipped' => 'skipped',
            ! is_numeric($accuracy) => 'unavailable',
            (float) $accuracy >= 90 => 'excellent',
            (float) $accuracy >= 75 => 'strong',
            (float) $accuracy >= 50 => 'growing',
            default => 'beginning',
        };

        return [
            'sequence_key' => "lesson-run:{$run->id}:review:{$band}",
            'speech' => [[
                'kind' => 'published',
                'speech_key' => "lesson-5-performance-{$band}",
            ]],
            'display_mode' => 'review',
            'after_speech' => self::AFTER_NONE,
            'requires_speech_completion' => true,
        ];
    }
}
