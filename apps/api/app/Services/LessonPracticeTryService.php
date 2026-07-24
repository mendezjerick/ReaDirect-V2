<?php

namespace App\Services;

use App\Models\LessonItemAttempt;
use App\Models\LessonRun;

final class LessonPracticeTryService
{
    /**
     * Return learner-visible clear incorrect academic attempts for one run.
     *
     * @return array{
     *     count: int,
     *     entries: list<array{
     *         attempt_id: int,
     *         mission_key: string,
     *         mission_number: int,
     *         item_key: string,
     *         item_order: int,
     *         attempt_number: int,
     *         final_transcript: string
     *     }>
     * }
     */
    public function forRun(LessonRun $run): array
    {
        $attempts = LessonItemAttempt::query()
            ->with('response:id,lesson_run_id,mission_key,item_key,item_order')
            ->whereHas(
                'response',
                fn ($query) => $query->where('lesson_run_id', $run->id),
            )
            ->whereIn('attempt_kind', [
                LessonItemAttempt::KIND_INDEPENDENT,
                LessonItemAttempt::KIND_GUIDED,
            ])
            ->where(
                'audio_classification',
                LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT,
            )
            ->whereNotNull('final_transcript')
            ->latest('id')
            ->get();

        $entries = $attempts->map(function (
            LessonItemAttempt $attempt,
        ): array {
            $response = $attempt->response;
            preg_match('/(\d+)$/', $response->mission_key, $missionMatch);

            return [
                'attempt_id' => $attempt->id,
                'mission_key' => $response->mission_key,
                'mission_number' => max(
                    1,
                    (int) ($missionMatch[1] ?? 1),
                ),
                'item_key' => $response->item_key,
                'item_order' => $response->item_order,
                'attempt_number' => (int) $attempt->academic_attempt_number,
                'final_transcript' => trim(
                    (string) $attempt->final_transcript,
                ),
            ];
        })->values()->all();

        return [
            'count' => count($entries),
            'entries' => $entries,
        ];
    }
}
