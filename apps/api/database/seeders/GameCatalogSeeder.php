<?php

namespace Database\Seeders;

use App\Models\GameCatalog;
use Illuminate\Database\Seeder;

final class GameCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $game = GameCatalog::query()->firstOrNew([
            'game_key' => GameCatalog::GAME_ONE_KEY,
        ]);

        $game->fill([
            'display_title' => 'Chronicles of the Lost Kingdom',
            'slot' => GameCatalog::GAME_ONE_SLOT,
            'engine' => 'kaplay',
            'contract_version' => 1,
            'current_ruleset_version' => 'v1',
            'has_meaningful_progression' => true,
        ]);

        if (! $game->exists) {
            $game->is_active = true;
        }

        $game->save();
    }
}
