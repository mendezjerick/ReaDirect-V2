<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
            $table->string('password');
            $table->string('first_name', 80);
            $table->string('middle_name', 80);
            $table->string('last_name', 80);
            $table->string('suffix', 20)->nullable();
            $table->string('lrn', 50)->nullable();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('staff_users')->cascadeOnDelete();
            $table->unsignedTinyInteger('grade_level');
            $table->string('section', 80);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['teacher_id', 'is_active']);
            $table->index(['school_id', 'grade_level', 'section']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learners');
        Schema::dropIfExists('learner_code_counters');
    }
};
