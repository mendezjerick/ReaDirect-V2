<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_runs', function (Blueprint $table): void {
            $table->string('selected_story_key', 120)->nullable()->after('part_one_level');
            $table->unsignedTinyInteger('passage_incorrect_words')->nullable()->after('selected_story_key');
            $table->unsignedTinyInteger('reading_accuracy_percent')->nullable()->after('passage_incorrect_words');
            $table->unsignedTinyInteger('comprehension_score')->nullable()->after('reading_accuracy_percent');
            $table->unsignedTinyInteger('comprehension_percent')->nullable()->after('comprehension_score');
            $table->unsignedTinyInteger('final_reading_score')->nullable()->after('comprehension_percent');
            $table->string('final_reading_profile', 48)->nullable()->after('final_reading_score');
            $table->timestamp('story_selected_at')->nullable()->after('part_one_completed_at');
            $table->timestamp('part_two_completed_at')->nullable()->after('story_selected_at');
            $table->timestamp('assessment_completed_at')->nullable()->after('part_two_completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('assessment_runs', function (Blueprint $table): void {
            $table->dropColumn([
                'selected_story_key',
                'passage_incorrect_words',
                'reading_accuracy_percent',
                'comprehension_score',
                'comprehension_percent',
                'final_reading_score',
                'final_reading_profile',
                'story_selected_at',
                'part_two_completed_at',
                'assessment_completed_at',
            ]);
        });
    }
};
