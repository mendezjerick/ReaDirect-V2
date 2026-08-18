<?php

namespace Tests\Feature;

use App\Models\GameCatalog;
use App\Models\GameProfile;
use App\Models\GameSave;
use App\Models\Learner;
use App\Models\LearnerSession;
use Database\Seeders\GameCatalogSeeder;
use Tests\TestCase;

final class LearnerGameSaveApiTest extends TestCase
{
    public function test_game_profile_and_save_endpoints_require_a_valid_learner_session(): void
    {
        $this->getJson('/api/learners/games/profile')->assertUnauthorized();
        $this->postJson('/api/learners/games/profile', [
            'username' => 'Reader7',
        ])->assertUnauthorized();
        $this->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertUnauthorized();
        $this->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', [])
            ->assertUnauthorized();
    }

    public function test_expired_sessions_cannot_read_or_write_game_data(): void
    {
        $this->activateGameOne();
        $learner = $this->createLearner('GS008');
        $headers = $this->authenticate($learner, 'expired-game-token');

        LearnerSession::query()
            ->where('token_hash', hash('sha256', 'expired-game-token'))
            ->update(['expires_at' => now()->subMinute()]);

        $this->withHeaders($headers)
            ->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertUnauthorized();
        $this->withHeaders($headers)
            ->putJson(
                '/api/learners/games/chronicles-of-the-lost-kingdom/save',
                $this->savePayload(),
            )
            ->assertUnauthorized();

        $this->assertDatabaseCount('game_profiles', 0);
        $this->assertDatabaseCount('game_saves', 0);
    }

    public function test_a_learner_can_create_and_retrieve_one_server_owned_game_profile(): void
    {
        $learner = $this->createLearner('GP001');
        $headers = $this->authenticate($learner, 'profile-token');

        $created = $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
            'username' => 'Reader7',
        ]);

        $created->assertCreated()
            ->assertJsonPath('profile.audience', 'learner')
            ->assertJsonPath('profile.username', 'Reader7')
            ->assertJsonPath('profile.is_active', true);
        $this->assertMatchesRegularExpression(
            '/\AReader7#\d{4}\z/',
            $created->json('profile.public_handle'),
        );
        $this->assertDatabaseHas('game_profiles', [
            'learner_id' => $learner->id,
            'username' => 'Reader7',
            'username_normalized' => 'reader7',
            'is_active' => true,
        ]);

        $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
            'username' => 'READER7',
        ])->assertOk();
        $this->assertDatabaseCount('game_profiles', 1);

        $this->withHeaders($headers)->getJson('/api/learners/games/profile')
            ->assertOk()
            ->assertJsonPath('profile.username', 'Reader7');

        $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
            'username' => 'OtherName',
        ])->assertConflict();
    }

    public function test_game_profile_username_validation_is_bounded_and_ascii_only(): void
    {
        $headers = $this->authenticate($this->createLearner('GP002'), 'profile-validation-token');

        foreach (['ab', 'morethanten1', 'reader name', 'réader'] as $username) {
            $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
                'username' => $username,
            ])->assertUnprocessable();
        }

        foreach (['admin', 'TEACHER', 'system', 'readirect', 'Clara'] as $username) {
            $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
                'username' => $username,
            ])->assertUnprocessable();
        }

        $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
            'username' => 'clara123',
        ])->assertCreated();

        $this->assertDatabaseCount('game_profiles', 1);
    }

    public function test_preview_sessions_cannot_create_persistent_game_data(): void
    {
        $learner = $this->createLearner('GP003');
        $headers = $this->authenticate($learner, 'portal-preview-token', 'portal');

        $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
            'username' => 'Preview7',
        ])->assertForbidden();

        $portalLearner = $this->createLearner('GP004');
        $portalLearner->forceFill([
            'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
        ])->save();
        $portalHeaders = $this->authenticate(
            $portalLearner,
            'portal-system-learner-token',
        );

        $this->withHeaders($portalHeaders)->postJson('/api/learners/games/profile', [
            'username' => 'Portal4',
        ])->assertForbidden();

        $this->assertDatabaseCount('game_profiles', 0);
        $this->assertDatabaseCount('game_saves', 0);
    }

    public function test_inactive_catalog_games_cannot_be_loaded_or_written(): void
    {
        $learner = $this->createLearner('GS001');
        $headers = $this->authenticate($learner, 'inactive-game-token');
        $this->createProfileThroughApi($headers, 'Inactive1');
        $this->seedGameCatalog();
        GameCatalog::query()
            ->where('game_key', GameCatalog::GAME_ONE_KEY)
            ->update(['is_active' => false]);

        $this->withHeaders($headers)
            ->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertNotFound();
        $this->withHeaders($headers)
            ->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', $this->savePayload())
            ->assertNotFound();

        $this->assertDatabaseCount('game_saves', 0);
    }

    public function test_a_save_can_be_created_loaded_and_updated_with_revision_control(): void
    {
        $this->activateGameOne();
        $learner = $this->createLearner('GS002');
        $otherLearner = $this->createLearner('GS003');
        $headers = $this->authenticate($learner, 'save-owner-token');

        $this->withHeaders($headers)
            ->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertConflict();

        $this->createProfileThroughApi($headers, 'Saver2');

        $this->withHeaders($headers)
            ->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertOk()
            ->assertJsonPath('save', null);

        $created = $this->withHeaders($headers)
            ->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', [
                ...$this->savePayload(),
                'learner_id' => $otherLearner->id,
                'game_profile_id' => 999_999,
            ]);

        $created->assertOk()
            ->assertJsonPath('save.checkpoint_key', 'mission-1')
            ->assertJsonPath('save.save_schema_version', 1)
            ->assertJsonPath('save.state.mission.missionIndex', 0)
            ->assertJsonPath('save.revision', 1);

        $profile = GameProfile::query()->where('learner_id', $learner->id)->sole();
        $this->assertDatabaseHas('game_saves', [
            'game_profile_id' => $profile->id,
            'revision' => 1,
        ]);
        $this->assertDatabaseMissing('game_profiles', [
            'learner_id' => $otherLearner->id,
        ]);

        $this->withHeaders($headers)
            ->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', [
                ...$this->savePayload(),
                'expected_revision' => 0,
            ])
            ->assertConflict();

        $this->withHeaders($headers)
            ->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', [
                ...$this->savePayload(1, 1, 'mission-2'),
            ])
            ->assertOk()
            ->assertJsonPath('save.revision', 2)
            ->assertJsonPath('save.state.mission.missionIndex', 1);

        $this->withHeaders($headers)
            ->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertOk()
            ->assertJsonPath('save.checkpoint_key', 'mission-2')
            ->assertJsonPath('save.revision', 2);
    }

    public function test_two_learners_have_isolated_saves_for_the_same_game(): void
    {
        $this->activateGameOne();
        $firstLearner = $this->createLearner('GS004');
        $secondLearner = $this->createLearner('GS005');
        $firstHeaders = $this->authenticate($firstLearner, 'first-save-token');
        $secondHeaders = $this->authenticate($secondLearner, 'second-save-token');
        $this->createProfileThroughApi($firstHeaders, 'First4');
        $this->createProfileThroughApi($secondHeaders, 'Second5');

        $this->withHeaders($firstHeaders)
            ->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', [
                ...$this->savePayload(2),
            ])
            ->assertOk();

        $this->withHeaders($secondHeaders)
            ->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertOk()
            ->assertJsonPath('save', null);

        $this->withHeaders($secondHeaders)
            ->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', [
                ...$this->savePayload(0),
            ])
            ->assertOk();

        $this->assertDatabaseCount('game_saves', 2);
        $this->assertSame(
            $this->gameOneState(2),
            GameSave::query()
                ->where('game_profile_id', $firstLearner->gameProfile->id)
                ->sole()
                ->state,
        );
        $this->assertSame(
            $this->gameOneState(0),
            GameSave::query()
                ->where('game_profile_id', $secondLearner->gameProfile->id)
                ->sole()
                ->state,
        );
    }

    public function test_the_same_learner_can_resume_the_save_from_another_session(): void
    {
        $this->activateGameOne();
        $learner = $this->createLearner('GS009');
        $firstSession = $this->authenticate($learner, 'first-device-token');
        $secondSession = $this->authenticate($learner, 'second-device-token');
        $this->createProfileThroughApi($firstSession, 'Device9');

        $this->withHeaders($firstSession)
            ->putJson('/api/learners/games/chronicles-of-the-lost-kingdom/save', [
                ...$this->savePayload(2, 0, 'mission-3'),
            ])
            ->assertOk()
            ->assertJsonPath('save.revision', 1);

        $this->withHeaders($secondSession)
            ->getJson('/api/learners/games/chronicles-of-the-lost-kingdom/save')
            ->assertOk()
            ->assertJsonPath('save.checkpoint_key', 'mission-3')
            ->assertJsonPath('save.state.mission.missionIndex', 2)
            ->assertJsonPath('save.revision', 1);

        $this->assertDatabaseCount('game_profiles', 1);
        $this->assertDatabaseCount('game_saves', 1);
    }

    public function test_new_game_removes_only_the_current_games_save(): void
    {
        $gameOne = $this->activateGameOne();
        $gameTwo = GameCatalog::query()->where('game_key', GameCatalog::GAME_TWO_KEY)->sole();
        $gameTwo->forceFill(['is_active' => true])->save();
        $learner = $this->createLearner('GS006');
        $headers = $this->authenticate($learner, 'new-game-token');
        $this->createProfileThroughApi($headers, 'Reset6');

        $this->withHeaders($headers)
            ->putJson("/api/learners/games/{$gameOne->game_key}/save", $this->savePayload())
            ->assertOk();
        $this->withHeaders($headers)
            ->putJson("/api/learners/games/{$gameTwo->game_key}/save", [
                ...$this->gameTwoPayload(),
            ])
            ->assertOk();

        $this->withHeaders($headers)
            ->postJson("/api/learners/games/{$gameOne->game_key}/new-game", [
                'expected_revision' => 0,
            ])
            ->assertConflict();
        $this->assertDatabaseCount('game_saves', 2);

        $this->withHeaders($headers)
            ->postJson("/api/learners/games/{$gameOne->game_key}/new-game", [
                'expected_revision' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('save', null);

        $this->assertDatabaseCount('game_saves', 1);
        $this->assertDatabaseHas('game_saves', ['game_id' => $gameTwo->id]);
        $this->assertDatabaseMissing('game_saves', ['game_id' => $gameOne->id]);
    }

    public function test_save_validation_rejects_invalid_or_oversized_state(): void
    {
        $this->activateGameOne();
        $headers = $this->authenticate($this->createLearner('GS007'), 'save-validation-token');
        $this->createProfileThroughApi($headers, 'Valid7');
        $url = '/api/learners/games/chronicles-of-the-lost-kingdom/save';

        $this->withHeaders($headers)->putJson($url, [
            ...$this->savePayload(),
            'checkpoint_key' => '../unsafe',
        ])->assertUnprocessable();
        $this->withHeaders($headers)->putJson($url, [
            ...$this->savePayload(),
            'save_schema_version' => 0,
        ])->assertUnprocessable();
        $this->withHeaders($headers)->putJson($url, [
            ...$this->savePayload(),
            'state' => [
                ...$this->savePayload()['state'],
                'mission' => [
                    ...$this->savePayload()['state']['mission'],
                    'learner_id' => 123,
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('state');
        $this->withHeaders($headers)->putJson($url, [
            ...$this->savePayload(),
            'state' => [
                ...$this->savePayload()['state'],
                'padding' => str_repeat('x', 262_144),
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('state');

        $this->assertDatabaseCount('game_saves', 0);
    }

    public function test_game_alpha_v1_save_contract_rejects_invalid_payloads(): void
    {
        $this->seedGameCatalog();
        $alpha = GameCatalog::query()->where('game_key', GameCatalog::GAME_ALPHA_KEY)->sole();
        $alpha->forceFill(['is_active' => true])->save();
        $headers = $this->authenticate($this->createLearner('GA010'), 'alpha-contract-token');
        $this->createProfileThroughApi($headers, 'Alpha10');
        $url = "/api/learners/games/{$alpha->game_key}/save";

        $this->withHeaders($headers)->putJson($url, [
            'checkpoint_key' => 'run-complete',
            'save_schema_version' => 1,
            'state' => [
                'rulesetVersion' => 'game-alpha-score-v1',
                'personalBestScore' => 1200,
                'highestStageReached' => 2,
            ],
            'expected_revision' => 0,
        ])->assertOk();

        foreach ([
            ['personalBestScore' => -1],
            ['personalBestScore' => '1200'],
            ['highestStageReached' => 0],
            ['rulesetVersion' => 'v2'],
            ['unknown' => true],
        ] as $change) {
            $state = [
                'rulesetVersion' => 'game-alpha-score-v1',
                'personalBestScore' => 1200,
                'highestStageReached' => 2,
                ...$change,
            ];

            $this->withHeaders($headers)->putJson($url, [
                'checkpoint_key' => 'run-complete',
                'save_schema_version' => 1,
                'state' => $state,
                'expected_revision' => 1,
            ])->assertUnprocessable();
        }
    }

    public function test_game_one_v1_contract_rejects_unknown_envelope_fields_but_accepts_existing_shape(): void
    {
        $this->activateGameOne();
        $headers = $this->authenticate($this->createLearner('GO010'), 'game-one-contract-token');
        $this->createProfileThroughApi($headers, 'One10');
        $url = '/api/learners/games/chronicles-of-the-lost-kingdom/save';

        $this->withHeaders($headers)->putJson($url, $this->savePayload())->assertOk();

        $invalid = $this->savePayload();
        $invalid['state']['extra'] = true;
        $this->withHeaders($headers)->putJson($url, $invalid)->assertUnprocessable();

        $invalid = $this->savePayload();
        $invalid['state']['characterId'] = 'unknown-character';
        $this->withHeaders($headers)->putJson($url, $invalid)->assertUnprocessable();

        $invalid = $this->savePayload();
        $invalid['state']['mission']['missionIndex'] = 99;
        $this->withHeaders($headers)->putJson($url, $invalid)->assertUnprocessable();
    }

    public function test_ottertale_v1_save_contract_requires_completed_known_stages(): void
    {
        $this->seedGameCatalog();
        $game = GameCatalog::query()->where('game_key', GameCatalog::GAME_TWO_KEY)->sole();
        $game->forceFill(['is_active' => true])->save();
        $headers = $this->authenticate($this->createLearner('GT010'), 'ottertale-contract-token');
        $this->createProfileThroughApi($headers, 'Otter10');
        $url = "/api/learners/games/{$game->game_key}/save";

        $this->withHeaders($headers)->putJson($url, $this->gameTwoPayload())->assertOk();

        foreach ([
            ['rulesetVersion' => 'v2'],
            ['completedStageIds' => [99]],
            ['completedStageIds' => [1], 'bestScoresByStage' => ['2' => 20]],
            ['completedStageIds' => [1, 1]],
            ['completedStageIds' => [1], 'bestScoresByStage' => ['1' => -1]],
        ] as $change) {
            $state = [
                'rulesetVersion' => 'v1',
                'completedStageIds' => [1],
                'bestScoresByStage' => ['1' => 12],
                ...$change,
            ];

            $this->withHeaders($headers)->putJson($url, [
                'checkpoint_key' => 'stage-1-complete',
                'save_schema_version' => 1,
                'state' => $state,
                'expected_revision' => 1,
            ])->assertUnprocessable();
        }
    }

    public function test_ottertale_reset_is_target_only_and_revision_controlled(): void
    {
        $this->seedGameCatalog();
        $learner = $this->createLearner('GT011');
        $headers = $this->authenticate($learner, 'ottertale-reset-token');
        $this->createProfileThroughApi($headers, 'Otter11');

        $otterUrl = '/api/learners/games/ottertale/save';
        $alphaUrl = '/api/learners/games/game-alpha/save';
        $otterPayload = [
            'checkpoint_key' => 'stage-1-complete',
            'save_schema_version' => 1,
            'state' => [
                'rulesetVersion' => 'v1',
                'completedStageIds' => [1],
                'bestScoresByStage' => ['1' => 24],
            ],
            'expected_revision' => 0,
        ];

        $this->withHeaders($headers)->putJson($otterUrl, $otterPayload)->assertOk();
        $this->withHeaders($headers)->putJson($alphaUrl, [
            'checkpoint_key' => 'run-complete',
            'save_schema_version' => 1,
            'state' => [
                'rulesetVersion' => 'game-alpha-score-v1',
                'personalBestScore' => 12,
                'highestStageReached' => 1,
            ],
            'expected_revision' => 0,
        ])->assertOk();

        $this->withHeaders($headers)
            ->postJson('/api/learners/games/ottertale/new-game', ['expected_revision' => 1])
            ->assertOk()
            ->assertJsonPath('save', null);

        $this->withHeaders($headers)->getJson($otterUrl)->assertOk()->assertJsonPath('save', null);
        $this->withHeaders($headers)
            ->getJson($alphaUrl)
            ->assertOk()
            ->assertJsonPath('save.state.personalBestScore', 12);
    }

    private function activateGameOne(): GameCatalog
    {
        $this->seedGameCatalog();
        $game = GameCatalog::query()->where('game_key', GameCatalog::GAME_ONE_KEY)->sole();
        $game->forceFill(['is_active' => true])->save();

        return $game->fresh();
    }

    /**
     * @return array<string, string>
     */
    private function authenticate(
        Learner $learner,
        string $token,
        string $sessionType = 'standard',
    ): array {
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => $sessionType,
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [
            'Accept' => 'application/json',
            'Authorization' => "Bearer {$token}",
        ];
    }

    private function createLearner(string $learnerCode): Learner
    {
        return Learner::query()->create([
            'learner_code' => $learnerCode,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'game-save-api-password',
            'first_name' => 'Game',
            'middle_name' => 'Save',
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

    /**
     * @param  array<string, string>  $headers
     */
    private function createProfileThroughApi(array $headers, string $username): void
    {
        $this->withHeaders($headers)->postJson('/api/learners/games/profile', [
            'username' => $username,
        ])->assertCreated();
    }

    /**
     * @return array<string, mixed>
     */
    private function savePayload(
        int $missionIndex = 0,
        int $expectedRevision = 0,
        string $checkpointKey = 'mission-1',
    ): array
    {
        return [
            'checkpoint_key' => $checkpointKey,
            'save_schema_version' => 1,
            'state' => $this->gameOneState($missionIndex),
            'expected_revision' => $expectedRevision,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function gameOneState(int $missionIndex = 0): array
    {
        return [
            'contentVersionId' => 'bilingual-v1',
            'mission' => [
                'language' => 'en',
                'missionId' => 'plaza-welcome',
                'missionIndex' => $missionIndex,
                'stage' => 'approachStoryCharacter',
                'rounds' => [],
                'readingPageIndex' => 0,
                'actionAttempts' => 0,
                'currentQuestionIndex' => 0,
                'completedQuestionIds' => [],
                'savedQuestionIds' => [],
                'completedMissionIds' => [],
                'readingHeartsRemaining' => 3,
                'helpRequestCount' => 0,
                'comprehensionRestartCount' => 0,
                'attemptsByQuestion' => [],
                'incorrectSubmissionsByQuestion' => [],
                'activityCompleted' => false,
            ],
            'exploration' => [
                'version' => 1,
                'safePosition' => ['x' => 96, 'y' => 96],
                'discoveredFishingSpotIds' => [],
                'completedInteractionIds' => [],
                'fishingParticipation' => 0,
                'fishingAttempts' => 0,
                'caughtResultIds' => [],
            ],
            'tutorial' => [
                'active' => true,
                'step' => 'missionPanel',
                'completedSteps' => [],
                'skipConfirmationOpen' => false,
                'finished' => false,
            ],
            'characterId' => 'yato',
            'shopTask' => [
                'stage' => 'not-started',
                'hintUsed' => false,
                'inspectedIds' => [],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function gameTwoPayload(): array
    {
        return [
            'checkpoint_key' => 'stage-1-complete',
            'save_schema_version' => 1,
            'state' => [
                'rulesetVersion' => 'v1',
                'completedStageIds' => [1],
                'bestScoresByStage' => ['1' => 12],
            ],
            'expected_revision' => 0,
        ];
    }

    private function seedGameCatalog(): void
    {
        (new GameCatalogSeeder)->run();
    }
}
