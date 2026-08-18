<?php

namespace Database\Seeders;

use App\Models\GameCatalog;
use Illuminate\Database\Seeder;

final class GameCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $games = [
            [
                'game_key' => GameCatalog::GAME_ALPHA_KEY,
                'display_title' => 'Alphabet Defender',
                'slot' => GameCatalog::GAME_ALPHA_SLOT,
                'engine' => 'pixi',
                'contract_version' => 1,
                'current_ruleset_version' => 'game-alpha-score-v1',
                'has_meaningful_progression' => true,
                'new_is_active' => true,
            ],
            [
                'game_key' => GameCatalog::GAME_ONE_KEY,
                'display_title' => 'Chronicles of the Lost Kingdom',
                'slot' => GameCatalog::GAME_ONE_SLOT,
                'engine' => 'kaplay',
                'contract_version' => 1,
                'current_ruleset_version' => 'v1',
                'has_meaningful_progression' => true,
                'new_is_active' => true,
            ],
            [
                'game_key' => GameCatalog::GAME_TWO_KEY,
                'display_title' => 'OtterTale',
                'slot' => GameCatalog::GAME_TWO_SLOT,
                'engine' => 'pixi',
                'contract_version' => 1,
                'current_ruleset_version' => 'v1',
                'has_meaningful_progression' => true,
                'new_is_active' => true,
            ],
        ];

        foreach ($games as $metadata) {
            $game = GameCatalog::query()->firstOrNew([
                'game_key' => $metadata['game_key'],
            ]);
            $isNew = ! $game->exists;

            $game->fill([
                'display_title' => $metadata['display_title'],
                'slot' => $metadata['slot'],
                'engine' => $metadata['engine'],
                'contract_version' => $metadata['contract_version'],
                'current_ruleset_version' => $metadata['current_ruleset_version'],
                'has_meaningful_progression' => $metadata['has_meaningful_progression'],
            ]);

            if ($isNew) {
                $game->is_active = $metadata['new_is_active'];
            }

            $game->save();
        }
    }
}
