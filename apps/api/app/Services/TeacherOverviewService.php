<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonRun;
use App\Models\StaffUser;
use Illuminate\Support\Collection;

final class TeacherOverviewService
{
    /** @var list<string> */
    private const PART_ONE_LEVELS = [
        'Full Refresher',
        'Moderate Refresher',
        'Light Refresher',
        'Grade Ready',
    ];

    /** @var list<string> */
    private const READING_PROFILES = [
        'Low Emerging Reader',
        'High Emerging Reader',
        'Developing Reader',
        'Transitioning Reader',
        'Reading at Grade Level',
    ];

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
        $learners = Learner::query()
            ->with('progressState')
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->where('teacher_id', $teacher->id)
            ->get();
        $learnerIds = $learners->pluck('id');

        $assessmentRuns = $learnerIds->isEmpty()
            ? collect()
            : AssessmentRun::query()
                ->whereIn('learner_id', $learnerIds)
                ->latest('id')
                ->get();
        $lessonRuns = $learnerIds->isEmpty()
            ? collect()
            : LessonRun::query()
                ->whereIn('learner_id', $learnerIds)
                ->latest('id')
                ->get();

        $diagnosticPartOneRuns = $this->latestRunsByLearner(
            $assessmentRuns->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
                ->whereNotNull('part_one_level'),
        );
        $completedDiagnosticRuns = $this->latestRunsByLearner(
            $assessmentRuns->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
                ->where('status', AssessmentRun::STATUS_COMPLETED),
        );
        $completedFinalRuns = $this->latestRunsByLearner(
            $assessmentRuns->where('assessment_type', AssessmentRun::TYPE_FINAL)
                ->where('status', AssessmentRun::STATUS_COMPLETED),
        );

        return [
            'metrics' => $this->metrics($learners),
            'part_one_distribution' => $this->distribution(
                self::PART_ONE_LEVELS,
                $diagnosticPartOneRuns->pluck('part_one_level'),
            ),
            'diagnostic_reading_profile_distribution' => $this->distribution(
                self::READING_PROFILES,
                $completedDiagnosticRuns->pluck('final_reading_profile'),
            ),
            'final_reading_profile_distribution' => $this->distribution(
                self::READING_PROFILES,
                $completedFinalRuns->pluck('final_reading_profile'),
            ),
            'recent_learner_activity' => $this->recentActivity(
                $learners,
                $assessmentRuns,
                $lessonRuns,
            ),
        ];
    }

    /**
     * @param  Collection<int, Learner>  $learners
     * @return array<string, int>
     */
    private function metrics(Collection $learners): array
    {
        $diagnosticComplete = $learners->filter(
            fn (Learner $learner): bool => $learner->progressState?->diagnostic_completed_at !== null,
        )->count();
        $finalComplete = $learners->filter(
            fn (Learner $learner): bool => $learner->progressState?->final_assessment_completed_at !== null,
        )->count();
        $readyForFinal = $learners->filter(
            fn (Learner $learner): bool => $learner->progressState?->stage
                === LearnerProgressState::FINAL_ASSESSMENT_STAGE,
        )->count();

        return [
            'total_learners' => $learners->count(),
            'diagnostic_complete' => $diagnosticComplete,
            'diagnostic_pending' => $learners->count() - $diagnosticComplete,
            'ready_for_final' => $readyForFinal,
            'final_complete' => $finalComplete,
        ];
    }

    /**
     * @param  Collection<int, AssessmentRun>  $runs
     * @return Collection<int, AssessmentRun>
     */
    private function latestRunsByLearner(Collection $runs): Collection
    {
        return $runs
            ->unique('learner_id')
            ->values();
    }

    /**
     * @param  list<string>  $labels
     * @param  Collection<int, mixed>  $values
     * @return list<array{label: string, value: int}>
     */
    private function distribution(array $labels, Collection $values): array
    {
        $counts = $values
            ->filter(fn (mixed $value): bool => is_string($value))
            ->countBy();

        return collect($labels)
            ->map(fn (string $label): array => [
                'label' => $label,
                'value' => (int) $counts->get($label, 0),
            ])
            ->all();
    }

    /**
     * @param  Collection<int, Learner>  $learners
     * @param  Collection<int, AssessmentRun>  $assessmentRuns
     * @param  Collection<int, LessonRun>  $lessonRuns
     * @return list<array<string, mixed>>
     */
    private function recentActivity(
        Collection $learners,
        Collection $assessmentRuns,
        Collection $lessonRuns,
    ): array {
        $learnersById = $learners->keyBy('id');

        $assessmentActivity = $assessmentRuns->map(
            function (AssessmentRun $run) use ($learnersById): array {
                $learner = $learnersById->get($run->learner_id);
                $completed = $run->status === AssessmentRun::STATUS_COMPLETED;
                $assessmentLabel = $run->assessment_type === AssessmentRun::TYPE_FINAL
                    ? 'Final Assessment'
                    : 'Diagnostic Assessment';
                $occurredAt = $run->assessment_completed_at ?? $run->updated_at;

                return [
                    'id' => "assessment-{$run->id}",
                    'learner_id' => $run->learner_id,
                    'learner_code' => $learner instanceof Learner
                        ? $learner->learner_code
                        : '',
                    'learner_name' => $learner instanceof Learner
                        ? $this->fullName($learner)
                        : '',
                    'activity_type' => $run->assessment_type === AssessmentRun::TYPE_FINAL
                        ? 'final_assessment'
                        : 'diagnostic_assessment',
                    'title' => $assessmentLabel,
                    'status' => $completed ? 'completed' : 'in_progress',
                    'occurred_at' => $occurredAt?->toIso8601String(),
                    'sort_at' => $occurredAt?->getTimestamp() ?? 0,
                ];
            },
        );

        $lessonActivity = $lessonRuns->map(
            function (LessonRun $run) use ($learnersById): array {
                $learner = $learnersById->get($run->learner_id);
                $completed = $run->status === LessonRun::STATUS_COMPLETED;
                $occurredAt = $run->completed_at ?? $run->updated_at;

                return [
                    'id' => "lesson-{$run->id}",
                    'learner_id' => $run->learner_id,
                    'learner_code' => $learner instanceof Learner
                        ? $learner->learner_code
                        : '',
                    'learner_name' => $learner instanceof Learner
                        ? $this->fullName($learner)
                        : '',
                    'activity_type' => 'lesson',
                    'title' => self::LESSON_TITLES[$run->lesson_key] ?? 'Lesson',
                    'status' => $completed ? 'completed' : 'in_progress',
                    'occurred_at' => $occurredAt?->toIso8601String(),
                    'sort_at' => $occurredAt?->getTimestamp() ?? 0,
                ];
            },
        );

        return $assessmentActivity
            ->concat($lessonActivity)
            ->sortByDesc('sort_at')
            ->take(8)
            ->map(function (array $activity): array {
                unset($activity['sort_at']);

                return $activity;
            })
            ->values()
            ->all();
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
