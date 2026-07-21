<?php

use App\Services\SpeechProcessingSettings;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 120)->unique();
            $table->json('value');
            $table->timestamps();
        });

        DB::table('system_settings')->insert([
            'key' => SpeechProcessingSettings::CONDITIONAL_MU_NOISE_REDUCTION_KEY,
            'value' => json_encode(['enabled' => false], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
