<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class AssessmentRun extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'learner_id',
        'assessment_type',
        'content_version',
        'status',
        'stage',
        'current_item_index',
        'content_snapshot',
        'part_one_branch',
        'task_1a_score',
        'task_2a_score',
        'task_2b_score',
        'part_one_score',
        'part_one_level',
        'selected_story_key',
        'passage_incorrect_words',
        'reading_accuracy_percent',
        'comprehension_score',
        'comprehension_percent',
        'final_reading_score',
        'final_reading_profile',
        'orientation_completed_at',
        'part_one_completed_at',
        'story_selected_at',
        'part_two_completed_at',
        'assessment_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'current_item_index' => 'integer',
            'content_snapshot' => 'array',
            'task_1a_score' => 'integer',
            'task_2a_score' => 'integer',
            'task_2b_score' => 'integer',
            'part_one_score' => 'integer',
            'passage_incorrect_words' => 'integer',
            'reading_accuracy_percent' => 'integer',
            'comprehension_score' => 'integer',
            'comprehension_percent' => 'integer',
            'final_reading_score' => 'integer',
            'orientation_completed_at' => 'datetime',
            'part_one_completed_at' => 'datetime',
            'story_selected_at' => 'datetime',
            'part_two_completed_at' => 'datetime',
            'assessment_completed_at' => 'datetime',
        ];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(AssessmentResponse::class);
    }
}
