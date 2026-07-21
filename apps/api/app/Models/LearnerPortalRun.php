<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LearnerPortalRun extends Model
{
    public const ACTIVE_STATUS = 'active';

    protected $fillable = [
        'learner_id',
        'launched_by_staff_user_id',
        'target_key',
        'status',
        'started_at',
        'ended_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }

    public function launchedBy(): BelongsTo
    {
        return $this->belongsTo(StaffUser::class, 'launched_by_staff_user_id');
    }
}
