<?php

namespace Tests\Feature;

use App\Models\GameCatalog;
use App\Models\GameProfile;
use App\Models\GameSave;
use App\Models\Learner;
use Database\Seeders\GameCatalogSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class GameDatabaseFoundationTest extends TestCase
{
    public function test_shared_game_tables_expose_the_required_foundation_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('game_catalog', [
            'game_key',
            'display_title',
            'slot',
            'engine',
            'contract_version',
            'current_ruleset_version',
            'has_meaningful_progression',
            'is_active',
        ]));
        $this->assertTrue(Schema::hasColumns('game_profiles', [
            'learner_id',
            'audience',
            'username',
            'username_normalized',
            'discriminator',
            'username_changed_at',
            'is_active',
        ]));
        $this->assertTrue(Schema::hasColumns('game_saves', [
            'game_profile_id',
            'game_id',
            'checkpoint_key',
            'save_schema_version',
            'state',
            'revision',
            'saved_at',
        ]));
    }

    public function test_game_catalog_seed_is_idempotent_and_preserves_activation_choices(): void
    {
        $this->seedGameCatalog();
        $this->seedGameCatalog();

        $this->assertDatabaseCount('game_catalog', 3);
        $this->assertDatabaseHas('game_catalog', [
            'game_key' => GameCatalog::GAME_ONE_KEY,
            'display_title' => 'Chronicles of the Lost Kingdom',
            'slot' => GameCatalog::GAME_ONE_SLOT,
            'engine' => 'kaplay',
            'contract_version' => 1,
            'current_ruleset_version' => 'v1',
            'has_meaningful_progression' => true,
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('game_catalog', [
            'game_key' => GameCatalog::GAME_ALPHA_KEY,
            'display_title' => 'Alphabet Defender',
            'slot' => GameCatalog::GAME_ALPHA_SLOT,
            'engine' => 'pixi',
            'contract_version' => 1,
            'current_ruleset_version' => 'game-alpha-score-v1',
            'has_meaningful_progression' => true,
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('game_catalog', [
            'game_key' => GameCatalog::GAME_TWO_KEY,
            'display_title' => 'OtterTale',
            'slot' => GameCatalog::GAME_TWO_SLOT,
            'engine' => 'pixi',
            'contract_version' => 1,
            'current_ruleset_version' => 'v1',
            'has_meaningful_progression' => true,
            'is_active' => false,
        ]);

        $game = GameCatalog::query()->where('game_key', GameCatalog::GAME_ONE_KEY)->sole();
        $game->forceFill(['is_active' => false])->save();

        $this->seedGameCatalog();

        $this->assertFalse($game->fresh()->is_active);
    }

    public function test_a_learner_can_own_only_one_game_profile(): void
    {
        $learner = $this->createLearner('GA001');
        $profile = $this->createProfile($learner, 'Reader7', 'reader7', '0001');

        $this->assertTrue($learner->gameProfile->is($profile));
        $this->assertTrue($profile->learner->is($learner));

        $this->expectException(QueryException::class);

        $this->createProfile($learner, 'Reader8', 'reader8', '0002');
    }

    public function test_public_game_handles_are_unique(): void
    {
        $firstLearner = $this->createLearner('GA002');
        $secondLearner = $this->createLearner('GA003');

        $this->createProfile($firstLearner, 'Reader7', 'reader7', '0042');

        $this->expectException(QueryException::class);

        $this->createProfile($secondLearner, 'READER7', 'reader7', '0042');
    }

    public function test_saves_are_isolated_by_profile_and_game(): void
    {
        $this->seedGameCatalog();

        $gameOne = GameCatalog::query()->where('game_key', GameCatalog::GAME_ONE_KEY)->sole();
        $gameTwo = GameCatalog::query()->where('game_key', GameCatalog::GAME_TWO_KEY)->sole();
        $profile = $this->createProfile(
            $this->createLearner('GA004'),
            'Reader9',
            'reader9',
            '0009',
        );

        $gameOneSave = GameSave::query()->create([
            'game_profile_id' => $profile->id,
            'game_id' => $gameOne->id,
            'checkpoint_key' => 'mission-2',
            'save_schema_version' => 1,
            'state' => ['mission_index' => 1],
            'revision' => 3,
            'saved_at' => now(),
        ]);
        GameSave::query()->create([
            'game_profile_id' => $profile->id,
            'game_id' => $gameTwo->id,
            'checkpoint_key' => 'trail-1',
            'save_schema_version' => 1,
            'state' => ['word_index' => 4],
            'revision' => 2,
            'saved_at' => now(),
        ]);

        $this->assertCount(2, $profile->saves);
        $this->assertSame(['mission_index' => 1], $gameOneSave->fresh()->state);
        $this->assertSame(3, $gameOneSave->fresh()->revision);

        $this->expectException(QueryException::class);

        GameSave::query()->create([
            'game_profile_id' => $profile->id,
            'game_id' => $gameOne->id,
            'checkpoint_key' => 'duplicate',
            'save_schema_version' => 1,
            'state' => [],
            'revision' => 1,
            'saved_at' => now(),
        ]);
    }

    public function test_deleting_a_learner_removes_their_profile_and_game_saves(): void
    {
        $this->seedGameCatalog();

        $learner = $this->createLearner('GA005');
        $profile = $this->createProfile($learner, 'Reader5', 'reader5', '0005');
        $save = GameSave::query()->create([
            'game_profile_id' => $profile->id,
            'game_id' => GameCatalog::query()->where('game_key', GameCatalog::GAME_ONE_KEY)->sole()->id,
            'checkpoint_key' => 'autosave',
            'save_schema_version' => 1,
            'state' => ['mission_index' => 0],
            'revision' => 1,
            'saved_at' => now(),
        ]);

        $learner->delete();

        $this->assertDatabaseMissing('game_profiles', ['id' => $profile->id]);
        $this->assertDatabaseMissing('game_saves', ['id' => $save->id]);
        $this->assertDatabaseCount('game_catalog', 3);
    }

    private function createLearner(string $learnerCode): Learner
    {
        return Learner::query()->create([
            'learner_code' => $learnerCode,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'foundation-test-password',
            'first_name' => 'Game',
            'middle_name' => 'Data',
            'last_name' => 'Learner',
            'suffix' => null,
            'lrn' => null,
            'school_id' => null,
            'teacher_id' => null,
            'grade_level' => null,
            'section' => null,
            'is_active' => true,
        ]);
    }

    private function seedGameCatalog(): void
    {
        (new GameCatalogSeeder)->run();
    }

    private function createProfile(
        Learner $learner,
        string $username,
        string $normalizedUsername,
        string $discriminator,
    ): GameProfile {
        return GameProfile::query()->create([
            'learner_id' => $learner->id,
            'audience' => GameProfile::AUDIENCE_LEARNER,
            'username' => $username,
            'username_normalized' => $normalizedUsername,
            'discriminator' => $discriminator,
            'is_active' => true,
        ]);
    }
}
