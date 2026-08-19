<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        foreach ([
            [
                'game_key' => 'game-alpha',
                'display_title' => 'Alphabet Defender',
                'slot' => 'game-alpha',
                'engine' => 'pixi',
                'contract_version' => 1,
                'current_ruleset_version' => 'game-alpha-score-v1',
                'has_meaningful_progression' => false,
            ],
            [
                'game_key' => 'ottertale',
                'display_title' => 'OtterTale',
                'slot' => 'game-two',
                'engine' => 'pixi',
                'contract_version' => 1,
                'current_ruleset_version' => 'v1',
                'has_meaningful_progression' => true,
            ],
        ] as $game) {
            DB::table('game_catalog')->insertOrIgnore([
                ...$game,
                'is_active' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        // Catalog rows may already own saves. Keep rollback non-destructive and
        // preserve any operator activation that happened after this migration.
    }
};
