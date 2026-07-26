<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class GameCatalog extends Model
{
    public const GAME_ONE_KEY = 'chronicles-of-the-lost-kingdom';

    public const GAME_ONE_SLOT = 'game-one';

    protected $table = 'game_catalog';

    protected $fillable = [
        'game_key',
        'display_title',
        'slot',
        'engine',
        'contract_version',
        'current_ruleset_version',
        'has_meaningful_progression',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'contract_version' => 'integer',
            'has_meaningful_progression' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function saves(): HasMany
    {
        return $this->hasMany(GameSave::class, 'game_id');
    }
}
