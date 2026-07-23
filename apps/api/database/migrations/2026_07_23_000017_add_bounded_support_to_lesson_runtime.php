<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_responses', function (Blueprint $table): void {
            $table->string('teaching_state', 32)->default('LISTENING')->after('decision');
            $table->string('outcome', 32)->nullable()->after('teaching_state');
            $table->unsignedTinyInteger('academic_attempt_count')->default(0)->after('outcome');
            $table->unsignedTinyInteger('technical_retry_count')->default(0)->after('academic_attempt_count');
            $table->string('highest_scaffold_used', 32)->default('none')->after('technical_retry_count');
            $table->boolean('independent_mastery')->default(false)->after('highest_scaffold_used');
            $table->string('diagnosis_key', 80)->nullable()->after('independent_mastery');
            $table->boolean('review_recommended')->default(false)->after('diagnosis_key');
            $table->timestamp('demonstration_given_at')->nullable()->after('review_recommended');
            $table->timestamp('completed_at')->nullable()->after('demonstration_given_at');
        });

        Schema::create('lesson_item_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lesson_response_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt_sequence');
            $table->string('attempt_kind', 24);
            $table->unsignedTinyInteger('academic_attempt_number')->nullable();
            $table->string('scaffold_level', 32)->default('none');
            $table->string('audio_classification', 32);
            $table->text('raw_transcript')->nullable();
            $table->text('final_transcript')->nullable();
            $table->string('decision', 32);
            $table->string('audio_path', 500)->nullable();
            $table->char('audio_sha256', 64)->nullable();
            $table->json('evidence')->nullable();
            $table->timestamps();

            $table->unique(['lesson_response_id', 'attempt_sequence']);
            $table->index(['lesson_response_id', 'attempt_kind']);
        });

        DB::table('lesson_responses')
            ->where('decision', 'CORRECT')
            ->update([
                'teaching_state' => 'INDEPENDENT_FEEDBACK',
                'outcome' => 'INDEPENDENT_CORRECT',
                'academic_attempt_count' => 1,
                'independent_mastery' => true,
                'completed_at' => now(),
            ]);
        DB::table('lesson_responses')
            ->where('decision', 'SKIPPED')
            ->update([
                'teaching_state' => 'ADVANCING',
                'outcome' => 'SKIPPED',
                'completed_at' => now(),
            ]);
        DB::table('lesson_responses')
            ->whereNull('outcome')
            ->update([
                'teaching_state' => 'REVIEW_SCHEDULED',
                'outcome' => 'NOT_YET_CORRECT',
                'academic_attempt_count' => 1,
                'review_recommended' => true,
                'completed_at' => now(),
            ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_item_attempts');

        Schema::table('lesson_responses', function (Blueprint $table): void {
            $table->dropColumn([
                'teaching_state',
                'outcome',
                'academic_attempt_count',
                'technical_retry_count',
                'highest_scaffold_used',
                'independent_mastery',
                'diagnosis_key',
                'review_recommended',
                'demonstration_given_at',
                'completed_at',
            ]);
        });
    }
};
