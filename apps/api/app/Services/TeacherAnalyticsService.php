<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LessonRun;
use App\Models\StaffUser;
use Illuminate\Support\Collection;

final class TeacherAnalyticsService
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
        $learnerIds = Learner::query()
            ->where('teacher_id', $teacher->id)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->pluck('id');
        $lessonRuns = $learnerIds->isEmpty()
            ? collect()
            : LessonRun::query()
                ->with('responses')
                ->whereIn('learner_id', $learnerIds)
                ->whereIn('lesson_key', array_keys(self::LESSON_TITLES))
                ->latest('id')
                ->get()
                ->unique(fn (LessonRun $run): string => "{$run->learner_id}:{$run->lesson_key}")
                ->values();
        $responses = $lessonRuns->flatMap(
            fn (LessonRun $run): Collection => $run->responses,
        );
        $assessmentRuns = $learnerIds->isEmpty()
            ? collect()
            : AssessmentRun::query()
                ->with('responses')
                ->whereIn('learner_id', $learnerIds)
                ->latest('id')
                ->get()
                ->unique(fn (AssessmentRun $run): string => "{$run->learner_id}:{$run->assessment_type}")
                ->values();

        $diagnoses = $responses
            ->pluck('diagnosis_key')
            ->filter(fn (mixed $key): bool => is_string($key) && $key !== '')
            ->countBy()
            ->sortDesc()
            ->map(fn (int $count, string $key): array => [
                'diagnosis_key' => $key,
                'label' => str_replace('_', ' ', ucfirst($key)),
                'items' => $count,
            ])
            ->values()
            ->all();

        return [
            'class_context' => [
                'school_name' => $teacher->school?->name,
                'grade_level' => $teacher->grade_level,
                'section' => $teacher->section,
            ],
            'generated_at' => now()->toIso8601String(),
            'cohort_size' => $learnerIds->count(),
            'lesson_evidence' => [
                'recorded_items' => $responses->count(),
                'independent_success' => $responses->where(
                    'outcome',
                    LessonTeachingStateMachine::OUTCOME_INDEPENDENT_CORRECT,
                )->count(),
                'supported_success' => $responses->where(
                    'outcome',
                    LessonTeachingStateMachine::OUTCOME_SUPPORTED_CORRECT,
                )->count(),
                'demonstrated_items' => $responses->where(
                    'outcome',
                    LessonTeachingStateMachine::OUTCOME_DEMONSTRATED,
                )->count(),
                'not_yet_correct' => $responses->where(
                    'outcome',
                    LessonTeachingStateMachine::OUTCOME_NOT_YET_CORRECT,
                )->count(),
                'unscorable_recordings' => $responses->where(
                    'outcome',
                    LessonTeachingStateMachine::OUTCOME_UNSCORABLE_AUDIO,
                )->count(),
                'review_recommended' => $responses->where('review_recommended', true)->count(),
                'technical_retries' => $responses->sum('technical_retry_count'),
            ],
            'assessment_skips' => [
                'diagnostic' => $this->skippedCount(
                    $assessmentRuns->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC),
                ),
                'final' => $this->skippedCount(
                    $assessmentRuns->where('assessment_type', AssessmentRun::TYPE_FINAL),
                ),
            ],
            'lesson_breakdown' => collect(self::LESSON_TITLES)
                ->map(function (string $title, string $lessonKey) use (
                    $learnerIds,
                    $lessonRuns,
                ): array {
                    $runs = $lessonRuns->where('lesson_key', $lessonKey);
                    $lessonResponses = $runs->flatMap(
                        fn (LessonRun $run): Collection => $run->responses,
                    );

                    return [
                        'lesson_key' => $lessonKey,
                        'title' => $title,
                        'cohort_size' => $learnerIds->count(),
                        'learners_started' => $runs->pluck('learner_id')->unique()->count(),
                        'learners_completed' => $runs
                            ->where('status', LessonRun::STATUS_COMPLETED)
                            ->pluck('learner_id')
                            ->unique()
                            ->count(),
                        'recorded_items' => $lessonResponses->count(),
                        'independent_success' => $lessonResponses->where(
                            'outcome',
                            LessonTeachingStateMachine::OUTCOME_INDEPENDENT_CORRECT,
                        )->count(),
                        'supported_success' => $lessonResponses->where(
                            'outcome',
                            LessonTeachingStateMachine::OUTCOME_SUPPORTED_CORRECT,
                        )->count(),
                        'review_recommended' => $lessonResponses
                            ->where('review_recommended', true)
                            ->count(),
                    ];
                })
                ->values()
                ->all(),
            'diagnoses' => $diagnoses,
        ];
    }

    /** @param Collection<int, AssessmentRun> $runs */
    private function skippedCount(Collection $runs): int
    {
        return $runs->sum(function (AssessmentRun $run): int {
            if ($run->completion_mode === AssessmentRun::COMPLETION_MODE_SKIPPED) {
                return 1;
            }

            return $run->responses
                ->filter(
                    fn ($response): bool => $response->response_type === 'skipped'
                        || $response->decision === 'SKIPPED',
                )
                ->count();
        });
    }
}
