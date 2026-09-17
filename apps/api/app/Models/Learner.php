<?php

namespace App\Models;

use App\Services\StaffSchoolYearService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Schema;

final class Learner extends Model
{
    public const PURPOSE_STANDARD = 'standard';

    public const PURPOSE_PORTAL_SYSTEM = 'portal_system';

    protected $fillable = [
        'learner_code',
        'account_purpose',
        'speech_language',
        'password',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'lrn',
        'school_id',
        'school_year_id',
        'teacher_id',
        'grade_level',
        'section',
        'is_active',
        'progress_reset_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'grade_level' => 'integer',
            'school_year_id' => 'integer',
            'is_active' => 'boolean',
            'progress_reset_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        self::addGlobalScope('staff-school-year', function (Builder $builder): void {
            if (! app()->bound('request') || ! Schema::hasColumn('learners', 'school_year_id')) {
                return;
            }

            $context = request()->attributes->get(StaffSchoolYearService::REQUEST_ATTRIBUTE);
            if (! is_array($context) || ($context['label'] ?? null) === null) {
                return;
            }

            $table = $builder->getModel()->getTable();
            $builder->where(function (Builder $query) use ($table, $context): void {
                $query
                    ->where("{$table}.account_purpose", '!=', self::PURPOSE_STANDARD)
                    ->orWhere(function (Builder $standardLearners) use ($table, $context): void {
                        $standardLearners->where(
                            "{$table}.account_purpose",
                            self::PURPOSE_STANDARD,
                        );

                        if (isset($context['id'])) {
                            $standardLearners->where(
                                "{$table}.school_year_id",
                                $context['id'],
                            );

                            return;
                        }

                        $standardLearners->whereExists(function ($years) use ($table, $context): void {
                            $years
                                ->selectRaw('1')
                                ->from('school_years')
                                ->whereColumn('school_years.id', "{$table}.school_year_id")
                                ->where('school_years.label', $context['label']);
                        });
                    });
            });
        });

        self::creating(function (Learner $learner): void {
            if ($learner->account_purpose !== self::PURPOSE_STANDARD
                || $learner->school_id === null
                || $learner->school_year_id !== null
                || ! Schema::hasTable('school_years')) {
                return;
            }

            $context = app()->bound('request')
                ? request()->attributes->get(StaffSchoolYearService::REQUEST_ATTRIBUTE)
                : null;
            $year = is_array($context) && isset($context['id'])
                ? SchoolYear::query()
                    ->whereKey($context['id'])
                    ->where('school_id', $learner->school_id)
                    ->first()
                : null;

            if ($year === null && is_array($context) && isset($context['label'])) {
                $year = SchoolYear::query()
                    ->where('school_id', $learner->school_id)
                    ->where('label', $context['label'])
                    ->first();
            }

            $learner->school_year_id = ($year ?? SchoolYear::currentForSchool($learner->school_id))?->id;
        });
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(StaffUser::class, 'teacher_id');
    }

    public function progressState(): HasOne
    {
        return $this->hasOne(LearnerProgressState::class);
    }

    public function gameProfile(): HasOne
    {
        return $this->hasOne(GameProfile::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(LearnerSession::class);
    }

    public function portalRuns(): HasMany
    {
        return $this->hasMany(LearnerPortalRun::class);
    }
}
