<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_catalog', function (Blueprint $table): void {
            $table->id();
            $table->string('game_key', 80)->unique();
            $table->string('display_title', 120);
            $table->string('slot', 16)->unique();
            $table->string('engine', 16);
            $table->unsignedTinyInteger('contract_version')->default(1);
            $table->string('current_ruleset_version', 32)->default('v1');
            $table->boolean('has_meaningful_progression')->default(false);
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index(['is_active', 'slot']);
        });

        Schema::create('game_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('learner_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('audience', 16)->default('learner');
            $table->string('username', 10);
            $table->string('username_normalized', 10);
            $table->char('discriminator', 4);
            $table->timestamp('username_changed_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['username_normalized', 'discriminator']);
            $table->index(['audience', 'is_active']);
        });

        Schema::create('game_saves', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('game_profile_id')->constrained('game_profiles')->cascadeOnDelete();
            $table->foreignId('game_id')->constrained('game_catalog')->restrictOnDelete();
            $table->string('checkpoint_key', 80)->default('autosave');
            $table->unsignedSmallInteger('save_schema_version')->default(1);
            $table->jsonb('state');
            $table->unsignedBigInteger('revision')->default(1);
            $table->timestamp('saved_at');
            $table->timestamps();

            $table->unique(['game_profile_id', 'game_id']);
            $table->index(['game_id', 'saved_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_saves');
        Schema::dropIfExists('game_profiles');
        Schema::dropIfExists('game_catalog');
    }
};
