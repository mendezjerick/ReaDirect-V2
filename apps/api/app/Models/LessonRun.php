<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class LessonRun extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_REVIEW = 'review';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'learner_id', 'lesson_key', 'content_version', 'status', 'mission_key',
        'current_item_index', 'content_snapshot', 'completed_at',
    ];

    protected function casts(): array
    {
        return ['current_item_index' => 'integer', 'content_snapshot' => 'array', 'completed_at' => 'datetime'];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(LessonResponse::class);
    }
}
