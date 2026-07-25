<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\StaffUser;
use Illuminate\Support\Collection;

final class SchoolAdminOverviewService
{
    /** @var list<string> */
    private const PART_ONE_LEVELS = [
        'Full Refresher',
        'Moderate Refresher',
        'Light Refresher',
        'Grade Ready',
    ];

    /** @return array<string, mixed> */
    public function build(StaffUser $administrator): array
    {
        $learners = Learner::query()
            ->with('teacher:id,username,display_name')
            ->where('school_id', $administrator->school_id)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->get();
        $learnerIds = $learners->pluck('id');
        $assessmentRuns = $learnerIds->isEmpty()
            ? collect()
            : AssessmentRun::query()
                ->whereIn('learner_id', $learnerIds)
                ->latest('id')
                ->get();
        $latestDiagnostic = $assessmentRuns
            ->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
            ->unique('learner_id');
        $partOneCounts = $latestDiagnostic
            ->pluck('part_one_level')
            ->filter(fn (mixed $value): bool => is_string($value))
            ->countBy();

        return [
            'metrics' => [
                'total_teachers' => StaffUser::query()
                    ->where('role', 'teacher')
                    ->where('school_id', $administrator->school_id)
                    ->count(),
                'total_learners' => $learners->count(),
                'active_learners' => $learners
                    ->where('is_active', true)
                    ->count(),
            ],
            'part_one_distribution' => collect(self::PART_ONE_LEVELS)
                ->map(fn (string $label): array => [
                    'label' => $label,
                    'value' => (int) $partOneCounts->get($label, 0),
                ])
                ->all(),
            'recent_assessment_activity' => $this->recentActivity(
                $learners,
                $assessmentRuns,
            ),
        ];
    }

    /**
     * @param  Collection<int, Learner>  $learners
     * @param  Collection<int, AssessmentRun>  $runs
     * @return list<array<string, mixed>>
     */
    private function recentActivity(
        Collection $learners,
        Collection $runs,
    ): array {
        $learnersById = $learners->keyBy('id');

        return $runs
            ->map(function (AssessmentRun $run) use ($learnersById): array {
                /** @var Learner|null $learner */
                $learner = $learnersById->get($run->learner_id);
                $occurredAt = $run->assessment_completed_at ?? $run->updated_at;

                return [
                    'id' => $run->id,
                    'learner_id' => $run->learner_id,
                    'learner_code' => $learner?->learner_code ?? '',
                    'learner_name' => $learner
                        ? $this->fullName($learner)
                        : '',
                    'teacher_username' => $learner?->teacher?->username,
                    'assessment_type' => $run->assessment_type,
                    'assessment_label' => $run->assessment_type
                        === AssessmentRun::TYPE_FINAL
                        ? 'Final Assessment'
                        : 'Diagnostic Assessment',
                    'status' => $run->status,
                    'score' => $run->final_reading_score,
                    'profile' => $run->final_reading_profile,
                    'occurred_at' => $occurredAt?->toIso8601String(),
                    'sort_at' => $occurredAt?->getTimestamp() ?? 0,
                ];
            })
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
