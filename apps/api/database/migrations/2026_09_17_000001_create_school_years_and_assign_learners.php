<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const DEFAULT_LABEL = '2025-2026';

    public function up(): void
    {
        Schema::create('school_years', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('label', 9);
            $table->unsignedSmallInteger('start_year');
            $table->unsignedSmallInteger('end_year');
            $table->boolean('is_current')->default(false)->index();
            $table->string('status', 24)->default('planned');
            $table->timestamps();
            $table->unique(['school_id', 'label']);
            $table->index(['school_id', 'is_current']);
        });

        Schema::table('learners', function (Blueprint $table): void {
            $table->foreignId('school_year_id')
                ->nullable()
                ->after('school_id')
                ->constrained('school_years')
                ->nullOnDelete();
            $table->index(['school_id', 'school_year_id']);
        });

        $now = now();
        [$startYear, $endYear] = array_map('intval', explode('-', self::DEFAULT_LABEL));

        DB::table('schools')
            ->select('id')
            ->orderBy('id')
            ->each(function (object $school) use ($now, $startYear, $endYear): void {
                $yearId = DB::table('school_years')->insertGetId([
                    'school_id' => $school->id,
                    'label' => self::DEFAULT_LABEL,
                    'start_year' => $startYear,
                    'end_year' => $endYear,
                    'is_current' => true,
                    'status' => 'current',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('learners')
                    ->where('school_id', $school->id)
                    ->where('account_purpose', 'standard')
                    ->update(['school_year_id' => $yearId]);
            });
    }

    public function down(): void
    {
        Schema::table('learners', function (Blueprint $table): void {
            $table->dropForeign(['school_year_id']);
            $table->dropIndex(['school_id', 'school_year_id']);
            $table->dropColumn('school_year_id');
        });

        Schema::dropIfExists('school_years');
    }
};
