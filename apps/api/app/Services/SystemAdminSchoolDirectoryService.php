<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Learner;
use App\Models\School;
use App\Models\StaffUser;
use Illuminate\Support\Collection;

final class SystemAdminSchoolDirectoryService
{
    public function build(): array
    {
        $staffCounts = $this->staffCounts();
        $learnerCounts = $this->learnerCounts();

        $schools = School::query()
            ->orderBy('name')
            ->get(['id', 'name', 'created_at'])
            ->map(function (School $school) use ($staffCounts, $learnerCounts): array {
                $schoolStaff = $staffCounts->get($school->id, collect());
                $administrators = $schoolStaff->get('school_admin', $this->emptyCount());
                $teachers = $schoolStaff->get('teacher', $this->emptyCount());
                $learners = $learnerCounts->get($school->id, $this->emptyCount());

                return [
                    'id' => $school->id,
                    'name' => $school->name,
                    'school_administrators' => $administrators,
                    'teachers' => $teachers,
                    'learners' => $learners,
                    'created_at' => $school->created_at?->toIso8601String(),
                ];
            })
            ->values();

        return [
            'summary' => [
                'total_schools' => $schools->count(),
                'active_school_administrators' => $schools->sum(
                    fn (array $school): int => $school['school_administrators']['active'],
                ),
                'active_teachers' => $schools->sum(
                    fn (array $school): int => $school['teachers']['active'],
                ),
                'active_learners' => $schools->sum(
                    fn (array $school): int => $school['learners']['active'],
                ),
                'unassigned_school_administrators' => StaffUser::query()
                    ->where('role', 'school_admin')
                    ->whereNull('school_id')
                    ->count(),
            ],
            'schools' => $schools,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function staffCounts(): Collection
    {
        return StaffUser::query()
            ->select(['school_id', 'role'])
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN is_active = ? THEN 1 ELSE 0 END) as active', [true])
            ->whereNotNull('school_id')
            ->whereIn('role', ['school_admin', 'teacher'])
            ->groupBy('school_id', 'role')
            ->get()
            ->groupBy('school_id')
            ->map(fn (Collection $rows): Collection => $rows->keyBy('role')->map(
                fn (StaffUser $row): array => [
                    'total' => (int) $row->getAttribute('total'),
                    'active' => (int) $row->getAttribute('active'),
                ],
            ));
    }

    private function learnerCounts(): Collection
    {
        return Learner::query()
            ->select('school_id')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN is_active = ? THEN 1 ELSE 0 END) as active', [true])
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->whereNotNull('school_id')
            ->groupBy('school_id')
            ->get()
            ->keyBy('school_id')
            ->map(fn (Learner $row): array => [
                'total' => (int) $row->getAttribute('total'),
                'active' => (int) $row->getAttribute('active'),
            ]);
    }

    private function emptyCount(): array
    {
        return [
            'total' => 0,
            'active' => 0,
        ];
    }
}
