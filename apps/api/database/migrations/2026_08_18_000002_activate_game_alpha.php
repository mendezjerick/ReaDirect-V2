<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('game_catalog')
            ->where('game_key', 'game-alpha')
            ->update([
                'has_meaningful_progression' => true,
                'is_active' => true,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Keep the activation non-destructive; existing saves and operator
        // activation decisions must survive a rollback.
    }
};
