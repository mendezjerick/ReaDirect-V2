<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('game_catalog')
            ->where('game_key', 'ottertale')
            ->update([
                'has_meaningful_progression' => true,
                'is_active' => true,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Keep activation rollback non-destructive; saves and operator choices
        // must not be deleted or silently rewritten.
    }
};
