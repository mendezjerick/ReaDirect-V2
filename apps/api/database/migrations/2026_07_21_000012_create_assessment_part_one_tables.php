<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->string('assessment_type', 16)->default('diagnostic');
            $table->string('content_version', 24)->default('v1');
            $table->string('status', 24)->default('active');
            $table->string('stage', 40)->default('orientation');
            $table->unsignedTinyInteger('current_item_index')->default(0);
            $table->json('content_snapshot');
            $table->string('part_one_branch', 16)->nullable();
            $table->unsignedTinyInteger('task_1a_score')->nullable();
            $table->unsignedTinyInteger('task_2a_score')->nullable();
            $table->unsignedTinyInteger('task_2b_score')->nullable();
            $table->unsignedTinyInteger('part_one_score')->nullable();
            $table->string('part_one_level', 40)->nullable();
            $table->timestamp('orientation_completed_at')->nullable();
            $table->timestamp('part_one_completed_at')->nullable();
            $table->timestamps();

            $table->index(['learner_id', 'assessment_type', 'status']);
        });

        Schema::create('assessment_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assessment_run_id')->constrained()->cascadeOnDelete();
            $table->string('task_key', 24);
            $table->string('item_key', 80);
            $table->unsignedTinyInteger('item_order');
            $table->string('response_type', 24);
            $table->text('selected_response')->nullable();
            $table->text('raw_transcript')->nullable();
            $table->text('scoring_transcript')->nullable();
            $table->string('decision', 32)->nullable();
            $table->unsignedTinyInteger('score');
            $table->string('audio_path', 500)->nullable();
            $table->char('audio_sha256', 64)->nullable();
            $table->json('evidence')->nullable();
            $table->timestamps();

            $table->unique(['assessment_run_id', 'task_key', 'item_key']);
            $table->index(['assessment_run_id', 'task_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_responses');
        Schema::dropIfExists('assessment_runs');
    }
};
