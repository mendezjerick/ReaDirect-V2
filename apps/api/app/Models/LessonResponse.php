<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class LessonResponse extends Model
{
    protected $fillable = [
        'lesson_run_id', 'mission_key', 'item_key', 'item_order', 'response_type',
        'raw_transcript', 'final_transcript', 'decision', 'audio_path', 'audio_sha256', 'evidence',
        'teaching_state', 'outcome', 'academic_attempt_count', 'technical_retry_count',
        'highest_scaffold_used', 'independent_mastery', 'diagnosis_key',
        'review_recommended', 'demonstration_given_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'item_order' => 'integer',
            'academic_attempt_count' => 'integer',
            'technical_retry_count' => 'integer',
            'independent_mastery' => 'boolean',
            'review_recommended' => 'boolean',
            'demonstration_given_at' => 'datetime',
            'completed_at' => 'datetime',
            'evidence' => 'array',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(LessonRun::class, 'lesson_run_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(LessonItemAttempt::class)->orderBy('attempt_sequence');
    }
}
