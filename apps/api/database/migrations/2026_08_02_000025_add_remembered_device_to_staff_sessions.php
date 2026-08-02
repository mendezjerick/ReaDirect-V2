<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_sessions', function (Blueprint $table): void {
            $table->boolean('remembered')->default(false)->after('token_hash');
            $table->char('device_hash', 64)->nullable()->after('remembered')->index();
        });
    }

    public function down(): void
    {
        Schema::table('staff_sessions', function (Blueprint $table): void {
            $table->dropColumn(['remembered', 'device_hash']);
        });
    }
};
