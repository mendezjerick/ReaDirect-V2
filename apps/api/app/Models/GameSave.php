<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class GameSave extends Model
{
    protected $fillable = [
        'game_profile_id',
        'game_id',
        'checkpoint_key',
        'save_schema_version',
        'state',
        'revision',
        'saved_at',
    ];

    protected function casts(): array
    {
        return [
            'save_schema_version' => 'integer',
            'state' => 'array',
            'revision' => 'integer',
            'saved_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(GameProfile::class, 'game_profile_id');
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(GameCatalog::class, 'game_id');
    }
}
