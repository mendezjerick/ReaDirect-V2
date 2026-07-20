<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_users', function (Blueprint $table): void {
            $table->unsignedTinyInteger('grade_level')->nullable()->after('school_id');
            $table->string('section', 80)->nullable()->after('grade_level');
            $table->index(['school_id', 'role'], 'staff_users_school_role_index');
        });
    }

    public function down(): void
    {
        Schema::table('staff_users', function (Blueprint $table): void {
            $table->dropIndex('staff_users_school_role_index');
            $table->dropColumn(['grade_level', 'section']);
        });
    }
};
