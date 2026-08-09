<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
            'is_active' => 'boolean',
            'progress_reset_at' => 'datetime',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
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
