<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

final class SchoolYear extends Model
{
    public const DEFAULT_LABEL = '2025-2026';

    public const STATUS_CURRENT = 'current';

    public const STATUS_PLANNED = 'planned';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'school_id',
        'label',
        'start_year',
        'end_year',
        'is_current',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_year' => 'integer',
            'end_year' => 'integer',
            'is_current' => 'boolean',
        ];
    }

    public static function parseLabel(string $label): array
    {
        $normalized = trim($label);
        if (! preg_match('/^(\d{4})-(\d{4})$/', $normalized, $matches)) {
            throw new InvalidArgumentException('School years must use the YYYY-YYYY format.');
        }

        $startYear = (int) $matches[1];
        $endYear = (int) $matches[2];
        if ($endYear !== $startYear + 1) {
            throw new InvalidArgumentException('School years must span two adjacent calendar years.');
        }

        return [
            'label' => $normalized,
            'start_year' => $startYear,
            'end_year' => $endYear,
        ];
    }

    public static function ensureInitial(School $school): self
    {
        $year = self::query()
            ->where('school_id', $school->id)
            ->orderByDesc('is_current')
            ->orderByDesc('start_year')
            ->first();

        if ($year !== null) {
            return $year;
        }

        return self::query()->create([
            'school_id' => $school->id,
            ...self::parseLabel(self::DEFAULT_LABEL),
            'is_current' => true,
            'status' => self::STATUS_CURRENT,
        ]);
    }

    public static function currentForSchool(int $schoolId): ?self
    {
        return self::query()
            ->where('school_id', $schoolId)
            ->where('is_current', true)
            ->orderByDesc('start_year')
            ->first()
            ?? self::query()
                ->where('school_id', $schoolId)
                ->orderByDesc('start_year')
                ->first();
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function learners(): HasMany
    {
        return $this->hasMany(Learner::class);
    }
}
