<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class GameProfile extends Model
{
    public const AUDIENCE_LEARNER = 'learner';

    protected $fillable = [
        'learner_id',
        'audience',
        'username',
        'username_normalized',
        'discriminator',
        'username_changed_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'username_changed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }

    public function saves(): HasMany
    {
        return $this->hasMany(GameSave::class);
    }
}
