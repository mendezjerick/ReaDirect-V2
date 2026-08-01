<?php

declare(strict_types=1);

use App\Services\LearnerLightweightModeSettings;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('system_settings')->insertOrIgnore([
            'key' => LearnerLightweightModeSettings::KEY,
            'value' => json_encode([
                'enabled' => false,
                'static_clara' => true,
                'published_speech_only' => true,
            ], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('system_settings')
            ->where('key', LearnerLightweightModeSettings::KEY)
            ->delete();
    }
};
