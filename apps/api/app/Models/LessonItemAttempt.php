<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LessonItemAttempt extends Model
{
    public const KIND_INDEPENDENT = 'independent';

    public const KIND_GUIDED = 'guided';

    public const KIND_TECHNICAL = 'technical';

    public const KIND_ECHO = 'echo';

    public const KIND_SKIP = 'skip';

    protected $fillable = [
        'lesson_response_id',
        'attempt_sequence',
        'attempt_kind',
        'academic_attempt_number',
        'scaffold_level',
        'audio_classification',
        'raw_transcript',
        'final_transcript',
        'decision',
        'evidence',
    ];

    protected function casts(): array
    {
        return [
            'attempt_sequence' => 'integer',
            'academic_attempt_number' => 'integer',
            'evidence' => 'array',
        ];
    }

    public function response(): BelongsTo
    {
        return $this->belongsTo(LessonResponse::class, 'lesson_response_id');
    }
}
