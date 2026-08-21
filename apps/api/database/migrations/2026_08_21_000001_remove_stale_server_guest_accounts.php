<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('guest_sessions');
        Schema::dropIfExists('guest_accounts');
    }

    public function down(): void
    {
        Schema::create('guest_accounts', function (Blueprint $table): void {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('display_name', 120)->nullable();
            $table->timestamp('email_verified_at')->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('last_signed_in_at')->nullable();
            $table->timestamps();
        });

        Schema::create('guest_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('guest_account_id')->constrained()->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('revoked_at')->nullable()->index();
            $table->timestamps();
            $table->index(['guest_account_id', 'revoked_at']);
        });
    }
};
