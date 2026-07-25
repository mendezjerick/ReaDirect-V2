<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class StaffResponseReview extends Model
{
    public const KIND_ASSESSMENT = 'assessment';

    public const KIND_LESSON = 'lesson';

    protected $fillable = [
        'learner_id',
        'reviewed_by_staff_user_id',
        'response_kind',
        'response_id',
        'original_transcript',
        'original_decision',
        'reviewed_transcript',
        'reviewed_decision',
        'notes',
    ];

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(StaffUser::class, 'reviewed_by_staff_user_id');
    }
}
