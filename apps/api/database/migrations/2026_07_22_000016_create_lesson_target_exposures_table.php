<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_target_exposures', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->string('scope_key', 100);
            $table->string('content_version', 24);
            $table->unsignedInteger('cycle');
            $table->string('target_key', 80);
            $table->timestamp('encountered_at');
            $table->timestamps();

            $table->unique(['learner_id', 'scope_key', 'content_version', 'cycle', 'target_key'], 'lesson_target_exposure_unique');
            $table->index(['learner_id', 'scope_key', 'content_version', 'cycle'], 'lesson_target_exposure_cycle');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_target_exposures');
    }
};
