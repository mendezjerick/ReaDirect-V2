<?php

namespace App\Services;

use App\Models\GameProfile;
use App\Models\Learner;
use App\Rules\GameUsername;
use App\Models\LearnerSession;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

final class LearnerGameProfileService
{
    private const DISCRIMINATOR_LIMIT = 10_000;

    private const CREATE_ATTEMPTS = 5;

    public function current(LearnerSession $session): ?GameProfile
    {
        $this->assertPersistentPlayer($session);

        return GameProfile::query()
            ->where('learner_id', $session->learner_id)
            ->first();
    }

    public function active(LearnerSession $session): GameProfile
    {
        $profile = $this->current($session);

        abort_if($profile === null, 409, 'Create a game profile before saving game progress.');
        abort_unless($profile->is_active, 403, 'This game profile is inactive.');

        return $profile;
    }

    /**
     * @return array{profile: GameProfile, created: bool}
     */
    public function create(LearnerSession $session, string $username): array
    {
        $this->assertPersistentPlayer($session);
        $normalizedUsername = GameUsername::normalize($username);

        for ($attempt = 1; $attempt <= self::CREATE_ATTEMPTS; $attempt++) {
            try {
                return DB::transaction(function () use ($session, $username, $normalizedUsername): array {
                    Learner::query()->lockForUpdate()->findOrFail($session->learner_id);

                    $existing = GameProfile::query()
                        ->where('learner_id', $session->learner_id)
                        ->first();

                    if ($existing !== null) {
                        abort_unless(
                            hash_equals($existing->username_normalized, $normalizedUsername),
                            409,
                            'This learner already has a different game username.',
                        );

                        return ['profile' => $existing, 'created' => false];
                    }

                    $usedDiscriminators = GameProfile::query()
                        ->where('username_normalized', $normalizedUsername)
                        ->pluck('discriminator')
                        ->all();

                    abort_if(
                        count($usedDiscriminators) >= self::DISCRIMINATOR_LIMIT,
                        409,
                        'That game username has no available discriminator.',
                    );

                    $used = array_fill_keys($usedDiscriminators, true);
                    $start = random_int(0, self::DISCRIMINATOR_LIMIT - 1);
                    $discriminator = null;

                    for ($offset = 0; $offset < self::DISCRIMINATOR_LIMIT; $offset++) {
                        $candidate = str_pad(
                            (string) (($start + $offset) % self::DISCRIMINATOR_LIMIT),
                            4,
                            '0',
                            STR_PAD_LEFT,
                        );

                        if (! isset($used[$candidate])) {
                            $discriminator = $candidate;
                            break;
                        }
                    }

                    abort_if($discriminator === null, 409, 'That game username is unavailable.');

                    return [
                        'profile' => GameProfile::query()->create([
                            'learner_id' => $session->learner_id,
                            'audience' => GameProfile::AUDIENCE_LEARNER,
                            'username' => $username,
                            'username_normalized' => $normalizedUsername,
                            'discriminator' => $discriminator,
                            'is_active' => true,
                        ]),
                        'created' => true,
                    ];
                });
            } catch (QueryException $error) {
                if (! $this->isUniqueConstraintViolation($error)) {
                    throw $error;
                }

                abort_if(
                    $attempt === self::CREATE_ATTEMPTS,
                    409,
                    'The game profile could not be created safely.',
                );
            }
        }

        abort(409, 'The game profile could not be created safely.');
    }

    private function assertPersistentPlayer(LearnerSession $session): void
    {
        abort_unless(
            $session->session_type === 'standard'
                && $session->learner->account_purpose === Learner::PURPOSE_STANDARD,
            403,
            'Persistent game data is unavailable in preview mode.',
        );
    }

    private function isUniqueConstraintViolation(QueryException $error): bool
    {
        return in_array((string) $error->getCode(), ['23000', '23505'], true);
    }
}
