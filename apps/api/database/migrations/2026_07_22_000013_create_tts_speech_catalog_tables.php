<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tts_voice_versions', function (Blueprint $table): void {
            $table->id();
            $table->string('stable_key', 80)->unique();
            $table->string('engine', 40);
            $table->string('model_identifier', 160);
            $table->string('reference_set', 80);
            $table->string('conditioning_version', 80);
            $table->json('synthesis_config');
            $table->string('status', 24)->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('tts_speech_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tts_voice_version_id')->constrained()->cascadeOnDelete();
            $table->string('speech_key', 120);
            $table->text('text');
            $table->string('reference_role', 40);
            $table->string('audio_storage_disk', 80);
            $table->string('audio_storage_path', 500);
            $table->char('audio_sha256', 64);
            $table->unsignedInteger('duration_ms');
            $table->string('status', 24)->default('draft');
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['tts_voice_version_id', 'speech_key']);
            $table->index(['speech_key', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tts_speech_lines');
        Schema::dropIfExists('tts_voice_versions');
    }
};
