<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LearnerProgressState extends Model
{
    public const BASELINE_STAGE = 'before_diagnostic';

    public const REQUIRED_LESSONS_STAGE = 'required_lessons';

    public const FINAL_ASSESSMENT_STAGE = 'final_assessment';

    public const READING_JOURNEY_COMPLETE_STAGE = 'reading_journey_complete';

    protected $fillable = [
        'learner_id',
        'stage',
        'current_required_lesson_order',
        'diagnostic_completed_at',
        'final_assessment_completed_at',
        'last_confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'current_required_lesson_order' => 'integer',
            'diagnostic_completed_at' => 'datetime',
            'final_assessment_completed_at' => 'datetime',
            'last_confirmed_at' => 'datetime',
        ];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }
}
