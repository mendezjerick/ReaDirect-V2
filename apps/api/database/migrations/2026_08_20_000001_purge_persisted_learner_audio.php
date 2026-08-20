<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        $disk = Storage::disk('local');
        foreach (['assessment-audio', 'lesson-audio'] as $directory) {
            if ($disk->exists($directory) && ! $disk->deleteDirectory($directory)) {
                throw new RuntimeException("Unable to purge legacy learner audio at {$directory}.");
            }

            if ($disk->exists($directory)) {
                throw new RuntimeException("Legacy learner audio remains at {$directory}.");
            }
        }

        if (Schema::hasTable('assessment_responses')) {
            DB::table('assessment_responses')->update([
                'audio_path' => null,
                'audio_sha256' => null,
            ]);
        }

        if (Schema::hasTable('lesson_responses')) {
            DB::table('lesson_responses')->update([
                'audio_path' => null,
                'audio_sha256' => null,
            ]);
        }

        if (Schema::hasTable('lesson_item_attempts')) {
            DB::table('lesson_item_attempts')->update([
                'audio_path' => null,
                'audio_sha256' => null,
            ]);
        }

    }

    public function down(): void
    {
        // Learner voice recordings are deliberately not recoverable.
    }
};
