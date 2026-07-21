<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class AssessmentResponse extends Model
{
    protected $fillable = [
        'assessment_run_id',
        'task_key',
        'item_key',
        'item_order',
        'response_type',
        'selected_response',
        'raw_transcript',
        'scoring_transcript',
        'decision',
        'score',
        'audio_path',
        'audio_sha256',
        'evidence',
    ];

    protected function casts(): array
    {
        return [
            'item_order' => 'integer',
            'score' => 'integer',
            'evidence' => 'array',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(AssessmentRun::class, 'assessment_run_id');
    }
}
