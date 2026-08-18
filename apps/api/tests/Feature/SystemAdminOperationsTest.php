<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GameCatalog;
use App\Models\GameProfile;
use App\Models\GameSave;
use App\Models\Learner;
use App\Models\School;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Database\Seeders\GameCatalogSeeder;
use Tests\TestCase;

final class SystemAdminOperationsTest extends TestCase
{
    public function test_system_administrator_can_review_global_audit_events_without_metadata(): void
    {
        $systemAdministrator = $this->systemAdministrator();
        $this->authenticateStaff($systemAdministrator);
        StaffAuditLog::query()->create([
            'staff_user_id' => $systemAdministrator->id,
            'action_key' => 'system.setting_changed',
            'description' => 'Changed an approved system setting.',
            'metadata' => ['private_token' => 'must-not-leak'],
        ]);
        StaffAuditLog::query()->create([
            'staff_user_id' => null,
            'action_key' => 'system.seeded',
            'description' => 'System data prepared.',
        ]);

        $this->getJson('/api/staff/system-admin/operations/audit-logs')
            ->assertOk()
            ->assertJsonPath('summary.total_events', 2)
            ->assertJsonPath('summary.events_last_24_hours', 2)
            ->assertJsonPath('summary.visible_events', 2)
            ->assertJsonPath('summary.unique_actors', 1)
            ->assertJsonPath('logs.0.actor', 'System')
            ->assertJsonPath('logs.1.actor', 'System Administrator')
            ->assertJsonMissingPath('logs.1.metadata')
            ->assertJsonMissing(['private_token', 'must-not-leak']);
    }

    public function test_system_administrator_can_review_game_catalog_players_and_save_metadata(): void
    {
        $this->authenticateStaff($this->systemAdministrator());
        $school = School::query()->create([
            'name' => 'Northfield Elementary',
            'normalized_name' => 'northfield elementary',
        ]);
        $learner = $this->learner($school, 'AA001', Learner::PURPOSE_STANDARD);
        $portalLearner = $this->learner($school, 'KW000', Learner::PURPOSE_PORTAL_SYSTEM);
        $game = GameCatalog::query()->create([
            'game_key' => GameCatalog::GAME_ONE_KEY,
            'display_title' => 'Chronicles of the Lost Kingdom',
            'slot' => GameCatalog::GAME_ONE_SLOT,
            'engine' => 'kaplay',
            'contract_version' => 1,
            'current_ruleset_version' => 'v1',
            'has_meaningful_progression' => true,
            'is_active' => true,
        ]);
        $profile = $this->profile($learner, 'Reader7', '4821');
        $portalProfile = $this->profile($portalLearner, 'Preview', '0001');
        GameSave::query()->create([
            'game_profile_id' => $profile->id,
            'game_id' => $game->id,
            'checkpoint_key' => 'forest-gate',
            'save_schema_version' => 1,
            'state' => ['private_world_state' => 'must-not-leak'],
            'revision' => 3,
            'saved_at' => now(),
        ]);
        GameSave::query()->create([
            'game_profile_id' => $portalProfile->id,
            'game_id' => $game->id,
            'checkpoint_key' => 'preview',
            'save_schema_version' => 1,
            'state' => [],
            'revision' => 1,
            'saved_at' => now(),
        ]);

        $this->getJson('/api/staff/system-admin/operations/games-and-players')
            ->assertOk()
            ->assertJsonPath('summary.catalog_games', 1)
            ->assertJsonPath('summary.active_games', 1)
            ->assertJsonPath('summary.player_profiles', 1)
            ->assertJsonPath('summary.players_with_saves', 1)
            ->assertJsonPath('summary.save_slots', 1)
            ->assertJsonPath('summary.guest_game_persistence_available', false)
            ->assertJsonPath('games.0.player_count', 1)
            ->assertJsonPath('players.0.handle', 'Reader7#4821')
            ->assertJsonPath('players.0.learner.learner_code', 'AA001')
            ->assertJsonPath('players.0.saves.0.checkpoint_key', 'forest-gate')
            ->assertJsonPath('players.0.saves.0.revision', 3)
            ->assertJsonMissing(['KW000', 'Preview#0001', 'private_world_state', 'must-not-leak'])
            ->assertJsonMissingPath('players.0.saves.0.state')
            ->assertJsonPath('governance.read_only', true);
    }

    public function test_operations_inspection_is_restricted_to_system_administrators(): void
    {
        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-operations-test',
            'password' => 'local-password',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($schoolAdministrator);

        $this->getJson('/api/staff/system-admin/operations/audit-logs')->assertForbidden();
        $this->getJson('/api/staff/system-admin/operations/games-and-players')->assertForbidden();
    }

    public function test_system_administrator_can_represent_all_three_canonical_games_as_active(): void
    {
        (new GameCatalogSeeder)->run();
        $this->authenticateStaff($this->systemAdministrator());

        $response = $this->getJson('/api/staff/system-admin/operations/games-and-players')
            ->assertOk()
            ->assertJsonPath('summary.catalog_games', 3)
            ->assertJsonPath('summary.active_games', 3);

        $games = collect($response->json('games'))->keyBy('game_key');

        $this->assertSame(true, $games[GameCatalog::GAME_ALPHA_KEY]['is_active']);
        $this->assertSame(true, $games[GameCatalog::GAME_ONE_KEY]['is_active']);
        $this->assertSame(true, $games[GameCatalog::GAME_TWO_KEY]['is_active']);
    }

    private function systemAdministrator(): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'system-admin-operations-test',
            'password' => 'local-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
    }

    private function learner(School $school, string $code, string $purpose): Learner
    {
        return Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => $purpose,
            'password' => 'local-password',
            'first_name' => $purpose === Learner::PURPOSE_STANDARD ? 'Ana' : 'Kristen',
            'middle_name' => '',
            'last_name' => 'Reader',
            'school_id' => $school->id,
            'grade_level' => 1,
            'section' => 'A',
            'is_active' => true,
        ]);
    }

    private function profile(
        Learner $learner,
        string $username,
        string $discriminator,
    ): GameProfile {
        return GameProfile::query()->create([
            'learner_id' => $learner->id,
            'audience' => GameProfile::AUDIENCE_LEARNER,
            'username' => $username,
            'username_normalized' => strtolower($username),
            'discriminator' => $discriminator,
            'is_active' => true,
        ]);
    }
}
