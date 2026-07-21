<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equivalence_rules', function (Blueprint $table): void {
            $table->id();
            $table->string('rule_type', 32)->index();
            $table->text('expected_text');
            $table->text('recognized_text');
            $table->string('scope', 16)->default('global')->index();
            $table->string('item_key', 160)->nullable()->index();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->foreignId('created_by_staff_user_id')->constrained('staff_users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['rule_type', 'expected_text', 'recognized_text', 'scope', 'item_key'],
                'equivalence_rules_unique_review'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equivalence_rules');
    }
};
