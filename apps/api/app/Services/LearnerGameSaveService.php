<?php

namespace App\Services;

use App\Models\GameCatalog;
use App\Models\GameSave;
use App\Models\LearnerSession;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use JsonException;

final class LearnerGameSaveService
{
    private const MAX_STATE_BYTES = 262_144;

    private const FORBIDDEN_STATE_KEYS = [
        'access_token',
        'authorization',
        'bearer_token',
        'discriminator',
        'email',
        'game_profile_id',
        'guest_id',
        'learner_code',
        'learner_id',
        'password',
        'refresh_token',
        'username',
    ];

    public function __construct(
        private readonly LearnerGameProfileService $profiles,
        private readonly LearnerGameSavePayloadValidator $payloads,
    ) {}

    public function load(LearnerSession $session, string $gameKey): ?GameSave
    {
        $game = $this->activeGame($gameKey);
        $profile = $this->profiles->active($session);

        return GameSave::query()
            ->where('game_profile_id', $profile->id)
            ->where('game_id', $game->id)
            ->first();
    }

    /**
     * @param  array<string, mixed>  $state
     */
    public function save(
        LearnerSession $session,
        string $gameKey,
        string $checkpointKey,
        int $saveSchemaVersion,
        array $state,
        int $expectedRevision,
    ): GameSave {
        $game = $this->activeGame($gameKey);
        $profile = $this->profiles->active($session);
        $this->assertNoIdentityData($state);
        $this->assertStateSize($state);
        $this->payloads->validate($game, $saveSchemaVersion, $state);

        try {
            return DB::transaction(function () use (
                $profile,
                $game,
                $checkpointKey,
                $saveSchemaVersion,
                $state,
                $expectedRevision,
            ): GameSave {
                $save = GameSave::query()
                    ->where('game_profile_id', $profile->id)
                    ->where('game_id', $game->id)
                    ->lockForUpdate()
                    ->first();

                if ($save === null) {
                    abort_unless($expectedRevision === 0, 409, 'Game save revision conflict.');

                    return GameSave::query()->create([
                        'game_profile_id' => $profile->id,
                        'game_id' => $game->id,
                        'checkpoint_key' => $checkpointKey,
                        'save_schema_version' => $saveSchemaVersion,
                        'state' => $state,
                        'revision' => 1,
                        'saved_at' => now(),
                    ]);
                }

                abort_unless(
                    $save->revision === $expectedRevision,
                    409,
                    'Game save revision conflict.',
                );

                $save->forceFill([
                    'checkpoint_key' => $checkpointKey,
                    'save_schema_version' => $saveSchemaVersion,
                    'state' => $state,
                    'revision' => $save->revision + 1,
                    'saved_at' => now(),
                ])->save();

                return $save->fresh();
            });
        } catch (QueryException $error) {
            if (in_array((string) $error->getCode(), ['23000', '23505'], true)) {
                abort(409, 'Game save revision conflict.');
            }

            throw $error;
        }
    }

    public function reset(
        LearnerSession $session,
        string $gameKey,
        int $expectedRevision,
    ): void {
        $game = $this->activeGame($gameKey);
        $profile = $this->profiles->active($session);

        DB::transaction(function () use ($profile, $game, $expectedRevision): void {
            $save = GameSave::query()
                ->where('game_profile_id', $profile->id)
                ->where('game_id', $game->id)
                ->lockForUpdate()
                ->first();

            if ($save === null) {
                abort_unless($expectedRevision === 0, 409, 'Game save revision conflict.');

                return;
            }

            abort_unless(
                $save->revision === $expectedRevision,
                409,
                'Game save revision conflict.',
            );

            $save->delete();
        });
    }

    private function activeGame(string $gameKey): GameCatalog
    {
        $game = GameCatalog::query()
            ->where('game_key', $gameKey)
            ->where('is_active', true)
            ->first();

        abort_if($game === null, 404, 'Game not found.');

        return $game;
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function assertStateSize(array $state): void
    {
        try {
            $encoded = json_encode($state, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw ValidationException::withMessages([
                'state' => ['The game save state is not valid JSON.'],
            ]);
        }

        if (strlen($encoded) > self::MAX_STATE_BYTES) {
            throw ValidationException::withMessages([
                'state' => ['The game save state may not exceed 256 KiB.'],
            ]);
        }
    }

    /**
     * @param  array<array-key, mixed>  $state
     */
    private function assertNoIdentityData(array $state): void
    {
        foreach ($state as $key => $value) {
            if (is_string($key)) {
                $normalizedKey = strtolower(str_replace('-', '_', $key));

                if (in_array($normalizedKey, self::FORBIDDEN_STATE_KEYS, true)) {
                    throw ValidationException::withMessages([
                        'state' => ['Game save state must not contain identity or credential data.'],
                    ]);
                }
            }

            if (is_array($value)) {
                $this->assertNoIdentityData($value);
            }
        }
    }
}
