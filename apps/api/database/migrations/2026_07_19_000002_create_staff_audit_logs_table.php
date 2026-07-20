<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('staff_user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action_key', 80)->index();
            $table->string('description');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_audit_logs');
    }
};
