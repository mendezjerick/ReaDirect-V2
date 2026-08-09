<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learners', function (Blueprint $table): void {
            $table->string('speech_language', 16)
                ->default('en')
                ->after('account_purpose');
        });

        Schema::table('tts_voice_versions', function (Blueprint $table): void {
            $table->string('language_code', 16)
                ->default('en')
                ->after('stable_key');
            $table->index(
                ['language_code', 'status', 'published_at'],
                'tts_voice_language_publication_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('tts_voice_versions', function (Blueprint $table): void {
            $table->dropIndex('tts_voice_language_publication_index');
            $table->dropColumn('language_code');
        });

        Schema::table('learners', function (Blueprint $table): void {
            $table->dropColumn('speech_language');
        });
    }
};
