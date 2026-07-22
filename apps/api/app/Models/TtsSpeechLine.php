<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class TtsSpeechLine extends Model
{
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'tts_voice_version_id',
        'speech_key',
        'text',
        'reference_role',
        'audio_storage_disk',
        'audio_storage_path',
        'audio_sha256',
        'duration_ms',
        'status',
        'generated_at',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'duration_ms' => 'integer',
            'generated_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function voiceVersion(): BelongsTo
    {
        return $this->belongsTo(TtsVoiceVersion::class, 'tts_voice_version_id');
    }
}
