<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->string('lesson_key', 48);
            $table->string('content_version', 24)->default('v1');
            $table->string('status', 24)->default('active');
            $table->string('mission_key', 32)->default('mission-1');
            $table->unsignedTinyInteger('current_item_index')->default(0);
            $table->json('content_snapshot');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['learner_id', 'lesson_key', 'status']);
        });

        Schema::create('lesson_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lesson_run_id')->constrained()->cascadeOnDelete();
            $table->string('mission_key', 32);
            $table->string('item_key', 80);
            $table->unsignedTinyInteger('item_order');
            $table->string('response_type', 24);
            $table->text('raw_transcript')->nullable();
            $table->text('final_transcript')->nullable();
            $table->string('decision', 32);
            $table->string('audio_path', 500)->nullable();
            $table->char('audio_sha256', 64)->nullable();
            $table->json('evidence')->nullable();
            $table->timestamps();

            $table->unique(['lesson_run_id', 'mission_key', 'item_key']);
        });

        Schema::create('learner_achievements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->string('achievement_key', 80);
            $table->timestamp('awarded_at');
            $table->json('evidence')->nullable();
            $table->timestamps();

            $table->unique(['learner_id', 'achievement_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learner_achievements');
        Schema::dropIfExists('lesson_responses');
        Schema::dropIfExists('lesson_runs');
    }
};
