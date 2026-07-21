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
    }
}
