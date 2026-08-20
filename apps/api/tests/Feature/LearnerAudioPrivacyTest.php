<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class LearnerAudioPrivacyTest extends TestCase
{
    public function test_privacy_migration_purges_legacy_audio_references_and_files(): void
    {
        Storage::fake('local');

        $learnerId = DB::table('learners')->insertGetId([
            'learner_code' => 'PV001',
            'password' => 'unused-test-password',
            'first_name' => 'Privacy',
            'middle_name' => 'Test',
            'last_name' => 'Learner',
        ]);
        $assessmentRunId = DB::table('assessment_runs')->insertGetId([
            'learner_id' => $learnerId,
            'content_snapshot' => json_encode([]),
        ]);
        DB::table('assessment_responses')->insert([
            'assessment_run_id' => $assessmentRunId,
            'task_key' => 'task-1a',
            'item_key' => 'letter-k',
            'item_order' => 1,
            'response_type' => 'speech',
            'decision' => 'CORRECT',
            'score' => 1,
            'audio_path' => 'assessment-audio/legacy.webm',
            'audio_sha256' => str_repeat('a', 64),
        ]);

        $lessonRunId = DB::table('lesson_runs')->insertGetId([
            'learner_id' => $learnerId,
            'lesson_key' => 'required-lesson-1',
            'content_snapshot' => json_encode([]),
        ]);
        $lessonResponseId = DB::table('lesson_responses')->insertGetId([
            'lesson_run_id' => $lessonRunId,
            'mission_key' => 'mission-1',
            'item_key' => 'letter-k',
            'item_order' => 1,
            'response_type' => 'speech',
            'decision' => 'CORRECT',
            'audio_path' => 'lesson-audio/legacy.webm',
            'audio_sha256' => str_repeat('b', 64),
        ]);
        DB::table('lesson_item_attempts')->insert([
            'lesson_response_id' => $lessonResponseId,
            'attempt_sequence' => 1,
            'attempt_kind' => 'independent',
            'audio_classification' => 'CLEAR_CORRECT',
            'decision' => 'CORRECT',
            'audio_path' => 'lesson-audio/legacy-attempt.webm',
            'audio_sha256' => str_repeat('c', 64),
        ]);

        Storage::disk('local')->put('assessment-audio/legacy.webm', 'voice');
        Storage::disk('local')->put('lesson-audio/legacy.webm', 'voice');
        Storage::disk('local')->put('lesson-audio/orphan.webm', 'voice');

        $migration = require database_path(
            'migrations/2026_08_20_000001_purge_persisted_learner_audio.php',
        );
        $migration->up();

        foreach (['assessment_responses', 'lesson_responses', 'lesson_item_attempts'] as $table) {
            $this->assertSame(0, DB::table($table)->whereNotNull('audio_path')->count());
            $this->assertSame(0, DB::table($table)->whereNotNull('audio_sha256')->count());
        }
        $this->assertFalse(Storage::disk('local')->exists('assessment-audio'));
        $this->assertFalse(Storage::disk('local')->exists('lesson-audio'));
    }

    public function test_teacher_audio_review_endpoints_are_not_registered(): void
    {
        $this->getJson('/api/staff/teacher/1/audio-reviews')->assertNotFound();
        $this->getJson('/api/staff/teacher/1/audio-reviews/assessment/1/audio')
            ->assertNotFound();
        $this->postJson('/api/staff/teacher/1/audio-reviews/assessment/1')
            ->assertNotFound();
    }
}
