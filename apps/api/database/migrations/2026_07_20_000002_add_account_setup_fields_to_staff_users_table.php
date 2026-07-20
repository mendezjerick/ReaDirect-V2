<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_users', function (Blueprint $table): void {
            $table->string('username', 64)->nullable()->change();
            $table->string('email')->nullable()->unique()->after('username');
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->foreignId('school_id')->nullable()->after('role')->constrained()->nullOnDelete();
            $table->boolean('requires_credential_setup')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('staff_users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('school_id');
            $table->dropUnique(['email']);
            $table->dropColumn(['email', 'email_verified_at', 'requires_credential_setup']);
            $table->string('username', 64)->nullable(false)->change();
        });
    }
};
