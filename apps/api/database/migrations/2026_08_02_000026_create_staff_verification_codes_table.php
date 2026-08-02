<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_verification_codes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('staff_user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 32);
            $table->string('destination_email', 254);
            $table->char('code_hash', 64);
            $table->unsignedTinyInteger('attempt_count')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->index(
                ['staff_user_id', 'purpose', 'consumed_at'],
                'staff_verification_codes_active_index',
            );
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_verification_codes');
    }
};
