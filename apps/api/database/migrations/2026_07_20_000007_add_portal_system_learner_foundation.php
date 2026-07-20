<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learners', function (Blueprint $table): void {
            $table->string('account_purpose', 32)->default('standard')->after('learner_code')->index();
            $table->timestamp('progress_reset_at')->nullable()->after('is_active');
            $table->unsignedBigInteger('school_id')->nullable()->change();
            $table->unsignedBigInteger('teacher_id')->nullable()->change();
            $table->unsignedTinyInteger('grade_level')->nullable()->change();
            $table->string('section', 80)->nullable()->change();
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

            $table->index(['learner_id', 'revoked_at']);
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

            $table->index(['learner_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learner_portal_runs');
        Schema::dropIfExists('learner_sessions');
        Schema::dropIfExists('learner_progress_states');

        DB::table('learners')->where('account_purpose', 'portal_system')->delete();

        Schema::table('learners', function (Blueprint $table): void {
            $table->dropColumn(['account_purpose', 'progress_reset_at']);
            $table->unsignedBigInteger('school_id')->nullable(false)->change();
            $table->unsignedBigInteger('teacher_id')->nullable(false)->change();
            $table->unsignedTinyInteger('grade_level')->nullable(false)->change();
            $table->string('section', 80)->nullable(false)->change();
        });
    }
};
