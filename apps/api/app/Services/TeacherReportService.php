<?php

namespace App\Services;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\StaffUser;
use Illuminate\Support\Collection;

final class TeacherReportService
{
    /** @var array<string, string> */
    private const STAGE_LABELS = [
        LearnerProgressState::BASELINE_STAGE => 'Diagnostic pending',
        'diagnostic_part_one' => 'Diagnostic Part 1',
        'diagnostic_part_two' => 'Diagnostic Part 2',
        'required_lessons' => 'Required lessons',
        LearnerProgressState::FINAL_ASSESSMENT_STAGE => 'Final Assessment ready',
        LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE => 'Reading Journey complete',
    ];

    /** @return array<string, mixed> */
    public function build(StaffUser $teacher): array
    {
        $learners = Learner::query()
            ->with('progressState')
            ->where('teacher_id', $teacher->id)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();
        $learnerIds = $learners->pluck('id');
        $assessmentRuns = $learnerIds->isEmpty()
            ? collect()
            : AssessmentRun::query()
                ->whereIn('learner_id', $learnerIds)
                ->latest('id')
                ->get();
        $latestDiagnostic = $this->latestByLearner(
            $assessmentRuns->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC),
        );
        $latestFinal = $this->latestByLearner(
            $assessmentRuns->where('assessment_type', AssessmentRun::TYPE_FINAL),
        );
        $latestRunIds = $latestDiagnostic->pluck('id')
            ->merge($latestFinal->pluck('id'));
        $skipsByLearner = $latestRunIds->isEmpty()
            ? collect()
            : AssessmentResponse::query()
                ->join('assessment_runs', 'assessment_runs.id', '=', 'assessment_responses.assessment_run_id')
                ->whereIn('assessment_responses.assessment_run_id', $latestRunIds)
                ->where(function ($query): void {
                    $query->where('assessment_responses.response_type', 'skipped')
                        ->orWhere('assessment_responses.decision', 'SKIPPED');
                })
                ->selectRaw('assessment_runs.learner_id, count(*) as aggregate')
                ->groupBy('assessment_runs.learner_id')
                ->pluck('aggregate', 'assessment_runs.learner_id');
        $completedLessons = $learnerIds->isEmpty()
            ? collect()
            : LessonRun::query()
                ->whereIn('learner_id', $learnerIds)
                ->where('status', LessonRun::STATUS_COMPLETED)
                ->whereIn('lesson_key', collect(range(1, 6))->map(
                    fn (int $order): string => "required-lesson-{$order}",
                ))
                ->get()
                ->groupBy('learner_id')
                ->map(fn (Collection $runs): int => $runs->pluck('lesson_key')->unique()->count());
        $reviewCounts = $learnerIds->isEmpty()
            ? collect()
            : LessonResponse::query()
                ->join('lesson_runs', 'lesson_runs.id', '=', 'lesson_responses.lesson_run_id')
                ->whereIn('lesson_runs.learner_id', $learnerIds)
                ->where('lesson_responses.review_recommended', true)
                ->selectRaw('lesson_runs.learner_id, count(*) as aggregate')
                ->groupBy('lesson_runs.learner_id')
                ->pluck('aggregate', 'lesson_runs.learner_id');

        $rows = $learners->map(function (Learner $learner) use (
            $completedLessons,
            $latestDiagnostic,
            $latestFinal,
            $reviewCounts,
            $skipsByLearner,
        ): array {
            $diagnostic = $latestDiagnostic->get($learner->id);
            $final = $latestFinal->get($learner->id);
            $stage = $learner->progressState?->stage
                ?? LearnerProgressState::BASELINE_STAGE;
            $skippedItems = (int) $skipsByLearner->get($learner->id, 0);
            $reviewRecommended = (int) $reviewCounts->get($learner->id, 0);

            return [
                'learner_id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'learner_name' => $this->fullName($learner),
                'active' => $learner->is_active,
                'stage' => $stage,
                'stage_label' => self::STAGE_LABELS[$stage] ?? 'Progress saved',
                'diagnostic' => $this->assessmentSummary($diagnostic),
                'required_lessons_completed' => (int) $completedLessons->get($learner->id, 0),
                'final' => $this->assessmentSummary($final),
                'skipped_items' => $skippedItems,
                'review_recommended_items' => $reviewRecommended,
                'has_review_evidence' => $skippedItems + $reviewRecommended > 0,
            ];
        })->values();

        return [
            'class_context' => [
                'school' => [
                    'id' => $teacher->school?->id,
                    'name' => $teacher->school?->name,
                ],
                'grade_level' => $teacher->grade_level,
                'section' => $teacher->section,
            ],
            'generated_at' => now()->toIso8601String(),
            'summary' => [
                'learners' => $rows->count(),
                'diagnostic_complete' => $rows->where('diagnostic.status', 'completed')->count(),
                'all_lessons_complete' => $rows->where('required_lessons_completed', 6)->count(),
                'final_complete' => $rows->where('final.status', 'completed')->count(),
                'with_review_evidence' => $rows->where('has_review_evidence', true)->count(),
            ],
            'learners' => $rows,
        ];
    }

    /** @return Collection<int, AssessmentRun> */
    private function latestByLearner(Collection $runs): Collection
    {
        return $runs->unique('learner_id')->keyBy('learner_id');
    }

    /** @return array<string, int|string|null> */
    private function assessmentSummary(?AssessmentRun $run): array
    {
        return [
            'status' => $run?->status ?? 'not_started',
            'score' => $run?->final_reading_score,
            'profile' => $run?->final_reading_profile,
            'completed_at' => $run?->assessment_completed_at?->toIso8601String(),
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
