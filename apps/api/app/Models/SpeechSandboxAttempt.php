<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SpeechSandboxAttempt extends Model
{
    public const MODE_LETTER = 'letter';

    public const MODE_GENERAL = 'general';

    protected $fillable = [
        'staff_user_id',
        'mode',
        'expected_value',
        'audio_path',
        'audio_original_name',
        'audio_mime_type',
        'audio_size_bytes',
        'audio_sha256',
        'service_status',
        'request_metadata',
        'service_response',
        'error_message',
        'review_outcome',
        'equivalence_rule_id',
    ];

    protected function casts(): array
    {
        return [
            'request_metadata' => 'array',
            'service_response' => 'array',
        ];
    }

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(StaffUser::class);
    }

    public function equivalenceRule(): BelongsTo
    {
        return $this->belongsTo(EquivalenceRule::class);
    }
}
