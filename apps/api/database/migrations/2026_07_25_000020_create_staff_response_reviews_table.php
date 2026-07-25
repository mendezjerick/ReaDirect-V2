<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_response_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewed_by_staff_user_id')->constrained('staff_users')->cascadeOnDelete();
            $table->string('response_kind', 24);
            $table->unsignedBigInteger('response_id');
            $table->text('original_transcript')->nullable();
            $table->string('original_decision', 32)->nullable();
            $table->text('reviewed_transcript');
            $table->string('reviewed_decision', 32);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['response_kind', 'response_id', 'id']);
            $table->index(['learner_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_response_reviews');
    }
};
