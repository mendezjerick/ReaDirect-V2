<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LearnerClaraListeningSession extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_LETTERS_COMPLETE = 'letters-complete';

    protected $fillable = [
        'learner_id',
        'lesson_key',
        'chapter_key',
        'scene_key',
        'story_branch',
        'heard_story_keys',
        'visit_count',
        'status',
        'chapter_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'heard_story_keys' => 'array',
            'visit_count' => 'integer',
            'chapter_completed_at' => 'datetime',
        ];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }
}
