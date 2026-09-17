<?php

namespace App\Services;

use App\Models\SchoolYear;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class StaffSchoolYearService
{
    public const REQUEST_ATTRIBUTE = 'staff_school_year';

    /** @return array{id: int|null, label: string}|null */
    public function resolve(StaffUser $staffUser, ?string $requestedLabel): ?array
    {
        $label = $requestedLabel === null ? null : trim($requestedLabel);

        if ($staffUser->school_id !== null) {
            $query = SchoolYear::query()->where('school_id', $staffUser->school_id);
            $year = $label === null
                ? SchoolYear::currentForSchool($staffUser->school_id)
                : $query->where('label', $label)->first();

            if ($year === null) {
                throw ValidationException::withMessages([
                    'school_year' => 'That school year is not available for this school.',
                ]);
            }

            return ['id' => $year->id, 'label' => $year->label];
        }

        if ($staffUser->role !== 'system_admin') {
            if ($label !== null) {
                throw ValidationException::withMessages([
                    'school_year' => 'Complete school setup before selecting a school year.',
                ]);
            }

            return null;
        }

        if ($label === null) {
            $label = SchoolYear::query()
                ->where('is_current', true)
                ->orderByDesc('start_year')
                ->value('label');
        } else {
            $exists = SchoolYear::query()->where('label', $label)->exists();
            if (! $exists) {
                throw ValidationException::withMessages([
                    'school_year' => 'That school year is not available.',
                ]);
            }
        }

        return $label === null ? null : ['id' => null, 'label' => $label];
    }

    /** @return list<array{id: int|null, label: string, start_year: int, end_year: int, is_current: bool, status: string}> */
    public function available(StaffUser $staffUser): array
    {
        if ($staffUser->school_id !== null) {
            return SchoolYear::query()
                ->where('school_id', $staffUser->school_id)
                ->orderByDesc('start_year')
                ->get()
                ->map(fn (SchoolYear $year): array => $this->serialize($year))
                ->all();
        }

        return SchoolYear::query()
            ->select('label', 'start_year', 'end_year')
            ->selectRaw('MAX(CASE WHEN is_current = ? THEN 1 ELSE 0 END) as current_flag', [true])
            ->selectRaw(
                'MAX(CASE WHEN is_current = ? THEN 2 WHEN status = ? THEN 1 ELSE 0 END) as status_rank',
                [true, SchoolYear::STATUS_PLANNED],
            )
            ->groupBy('label', 'start_year', 'end_year')
            ->orderByDesc('start_year')
            ->get()
            ->map(fn (SchoolYear $year): array => [
                'id' => null,
                'label' => $year->label,
                'start_year' => (int) $year->start_year,
                'end_year' => (int) $year->end_year,
                'is_current' => (bool) $year->getAttribute('current_flag'),
                'status' => match ((int) $year->getAttribute('status_rank')) {
                    2 => SchoolYear::STATUS_CURRENT,
                    1 => SchoolYear::STATUS_PLANNED,
                    default => SchoolYear::STATUS_CLOSED,
                },
            ])
            ->all();
    }

    public function createForSchool(StaffUser $staffUser, string $label): SchoolYear
    {
        if ($staffUser->role !== 'school_admin' || $staffUser->school_id === null) {
            abort(403, 'Only a school administrator can create a school year.');
        }

        try {
            $parsed = SchoolYear::parseLabel($label);
        } catch (\InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'label' => $exception->getMessage(),
            ]);
        }

        return DB::transaction(function () use ($staffUser, $parsed): SchoolYear {
            $existing = SchoolYear::query()
                ->where('school_id', $staffUser->school_id)
                ->where('label', $parsed['label'])
                ->lockForUpdate()
                ->first();
            if ($existing !== null) {
                throw ValidationException::withMessages([
                    'label' => 'That school year already exists.',
                ]);
            }

            SchoolYear::query()
                ->where('school_id', $staffUser->school_id)
                ->lockForUpdate()
                ->update([
                    'is_current' => false,
                    'status' => SchoolYear::STATUS_CLOSED,
                ]);

            $year = SchoolYear::query()->create([
                'school_id' => $staffUser->school_id,
                ...$parsed,
                'is_current' => true,
                'status' => SchoolYear::STATUS_CURRENT,
            ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'school_year.created',
                'description' => "Created and activated school year {$year->label}.",
                'metadata' => [
                    'school_id' => $staffUser->school_id,
                    'school_year_id' => $year->id,
                    'school_year' => $year->label,
                ],
            ]);

            return $year;
        });
    }

    /** @return array{id: int, label: string, start_year: int, end_year: int, is_current: bool, status: string} */
    private function serialize(SchoolYear $year): array
    {
        return [
            'id' => $year->id,
            'label' => $year->label,
            'start_year' => $year->start_year,
            'end_year' => $year->end_year,
            'is_current' => $year->is_current,
            'status' => $year->status,
        ];
    }
}
