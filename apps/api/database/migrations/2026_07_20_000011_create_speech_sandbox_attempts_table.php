<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('speech_sandbox_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('staff_user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('mode', 24)->index();
            $table->text('expected_value');
            $table->string('audio_path', 500);
            $table->string('audio_original_name', 255);
            $table->string('audio_mime_type', 120)->nullable();
            $table->unsignedBigInteger('audio_size_bytes');
            $table->char('audio_sha256', 64)->index();
            $table->unsignedSmallInteger('service_status')->nullable();
            $table->json('request_metadata')->nullable();
            $table->json('service_response')->nullable();
            $table->text('error_message')->nullable();
            $table->string('review_outcome', 32)->nullable()->index();
            $table->foreignId('equivalence_rule_id')
                ->nullable()
                ->constrained('equivalence_rules')
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('speech_sandbox_attempts');
    }
};
