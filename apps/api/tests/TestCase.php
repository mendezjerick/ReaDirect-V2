<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('assessment_responses');
        Schema::dropIfExists('assessment_runs');
        Schema::dropIfExists('learner_clara_listening_sessions');
        Schema::dropIfExists('learner_achievements');
        Schema::dropIfExists('lesson_item_attempts');
        Schema::dropIfExists('lesson_responses');
        Schema::dropIfExists('lesson_runs');
        Schema::dropIfExists('lesson_target_exposures');
        Schema::dropIfExists('tts_speech_lines');
        Schema::dropIfExists('tts_voice_versions');
        Schema::dropIfExists('speech_sandbox_attempts');
        Schema::dropIfExists('staff_audit_logs');
        Schema::dropIfExists('equivalence_rules');
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('learner_portal_runs');
        Schema::dropIfExists('learner_sessions');
        Schema::dropIfExists('learner_progress_states');
        Schema::dropIfExists('learners');
        Schema::dropIfExists('learner_code_counters');
        Schema::dropIfExists('staff_users');
        Schema::dropIfExists('schools');

        Schema::create('schools', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 180)->unique();
            $table->string('normalized_name', 180)->unique();
            $table->timestamps();
        });

        Schema::create('staff_users', function (Blueprint $table): void {
            $table->id();
            $table->string('username', 64)->nullable()->unique();
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role', 32)->index();
            $table->foreignId('school_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('grade_level')->nullable();
            $table->string('section', 80)->nullable();
            $table->timestamp('teacher_assignment_acknowledged_at')->nullable();
            $table->string('display_name', 120);
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_credential_setup')->default(false);
            $table->timestamps();
        });

        Schema::create('staff_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('staff_user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action_key', 80)->index();
            $table->string('description');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('equivalence_rules', function (Blueprint $table): void {
            $table->id();
            $table->string('rule_type', 32)->index();
            $table->text('expected_text');
            $table->text('recognized_text');
            $table->string('scope', 16)->default('global')->index();
            $table->string('item_key', 160)->nullable()->index();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->foreignId('created_by_staff_user_id')->constrained('staff_users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('speech_sandbox_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('staff_user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('mode', 24)->index();
            $table->text('expected_value');
            $table->string('audio_path', 500);
            $table->string('audio_original_name', 255);
            $table->string('audio_mime_type', 120)->nullable();
            $table->unsignedBigInteger('audio_size_bytes');
            $table->char('audio_sha256', 64)->index();
            $table->unsignedSmallInteger('service_status')->nullable();
            $table->json('request_metadata')->nullable();
            $table->json('service_response')->nullable();
            $table->text('error_message')->nullable();
            $table->string('review_outcome', 32)->nullable()->index();
            $table->foreignId('equivalence_rule_id')->nullable()->constrained('equivalence_rules')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('system_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 120)->unique();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('tts_voice_versions', function (Blueprint $table): void {
            $table->id();
            $table->string('stable_key', 80)->unique();
            $table->string('engine', 40);
            $table->string('model_identifier', 160);
            $table->string('reference_set', 80);
            $table->string('conditioning_version', 80);
            $table->json('synthesis_config');
            $table->string('status', 24)->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('tts_speech_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tts_voice_version_id')->constrained()->cascadeOnDelete();
            $table->string('speech_key', 120);
            $table->text('text');
            $table->string('reference_role', 40);
            $table->string('audio_storage_disk', 80);
            $table->string('audio_storage_path', 500);
            $table->char('audio_sha256', 64);
            $table->unsignedInteger('duration_ms');
            $table->string('status', 24)->default('draft');
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['tts_voice_version_id', 'speech_key']);
            $table->index(['speech_key', 'status']);
        });

        Schema::create('learner_code_counters', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->unsignedBigInteger('next_value')->default(0);
        });

        DB::table('learner_code_counters')->insert([
            'id' => 1,
            'next_value' => 0,
        ]);

        Schema::create('learners', function (Blueprint $table): void {
            $table->id();
            $table->char('learner_code', 5)->unique();
            $table->string('account_purpose', 32)->default('standard')->index();
            $table->string('password');
            $table->string('first_name', 80);
            $table->string('middle_name', 80);
            $table->string('last_name', 80);
            $table->string('suffix', 20)->nullable();
            $table->string('lrn', 50)->nullable();
            $table->foreignId('school_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('staff_users')->cascadeOnDelete();
            $table->unsignedTinyInteger('grade_level')->nullable();
            $table->string('section', 80)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('progress_reset_at')->nullable();
            $table->timestamps();
        });

        Schema::create('learner_progress_states', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('stage', 40)->default('before_diagnostic');
            $table->unsignedInteger('current_required_lesson_order')->nullable();
            $table->timestamp('diagnostic_completed_at')->nullable();
            $table->timestamp('final_assessment_completed_at')->nullable();
            $table->timestamp('last_confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('learner_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->string('session_type', 24)->default('standard');
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('learner_portal_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('launched_by_staff_user_id')->constrained('staff_users')->cascadeOnDelete();
            $table->string('target_key', 120);
            $table->string('status', 24)->default('active');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
        });

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
            $table->string('selected_story_key', 120)->nullable();
            $table->unsignedTinyInteger('passage_incorrect_words')->nullable();
            $table->unsignedTinyInteger('reading_accuracy_percent')->nullable();
            $table->unsignedTinyInteger('comprehension_score')->nullable();
            $table->unsignedTinyInteger('comprehension_percent')->nullable();
            $table->unsignedTinyInteger('final_reading_score')->nullable();
            $table->string('final_reading_profile', 48)->nullable();
            $table->timestamp('orientation_completed_at')->nullable();
            $table->timestamp('part_one_completed_at')->nullable();
            $table->timestamp('story_selected_at')->nullable();
            $table->timestamp('part_two_completed_at')->nullable();
            $table->timestamp('assessment_completed_at')->nullable();
            $table->timestamps();
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
        });

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
        });

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
            $table->string('teaching_state', 32)->default('LISTENING');
            $table->string('outcome', 32)->nullable();
            $table->unsignedTinyInteger('academic_attempt_count')->default(0);
            $table->unsignedTinyInteger('technical_retry_count')->default(0);
            $table->string('highest_scaffold_used', 32)->default('none');
            $table->boolean('independent_mastery')->default(false);
            $table->string('diagnosis_key', 80)->nullable();
            $table->boolean('review_recommended')->default(false);
            $table->timestamp('demonstration_given_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('audio_path', 500)->nullable();
            $table->char('audio_sha256', 64)->nullable();
            $table->json('evidence')->nullable();
            $table->timestamps();
            $table->unique(['lesson_run_id', 'mission_key', 'item_key']);
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
}
