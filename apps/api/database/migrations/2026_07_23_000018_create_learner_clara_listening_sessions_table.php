<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learner_clara_listening_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->string('lesson_key', 48)->default('lesson-1');
            $table->string('chapter_key', 48)->default('chapter-1');
            $table->string('scene_key', 80)->default('chapter-1-item-a');
            $table->string('story_branch', 32)->nullable();
            $table->json('heard_story_keys')->nullable();
            $table->unsignedInteger('visit_count')->default(1);
            $table->string('status', 32)->default('active');
            $table->timestamp('chapter_completed_at')->nullable();
            $table->timestamps();

            $table->unique(['learner_id', 'lesson_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learner_clara_listening_sessions');
    }
};
