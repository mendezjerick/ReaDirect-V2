<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class TtsVoiceVersion extends Model
{
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'stable_key',
        'engine',
        'model_identifier',
        'reference_set',
        'conditioning_version',
        'synthesis_config',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'synthesis_config' => 'array',
            'published_at' => 'datetime',
        ];
    }

    public function speechLines(): HasMany
    {
        return $this->hasMany(TtsSpeechLine::class);
    }
}
