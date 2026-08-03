<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_runs', function (Blueprint $table): void {
            $table->string('completion_mode', 24)
                ->default('standard')
                ->after('status');
            $table->timestamp('skipped_at')
                ->nullable()
                ->after('assessment_completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('assessment_runs', function (Blueprint $table): void {
            $table->dropColumn(['completion_mode', 'skipped_at']);
        });
    }
};
