<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Services\LearnerSessionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

final class LearnerAuthController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'learner_code' => ['required', 'string', 'size:5', 'regex:/^[A-Za-z]{2}[0-9]{3}$/'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $normalizedCode = mb_strtoupper(trim($credentials['learner_code']));
        $learner = Learner::query()
            ->where('learner_code', $normalizedCode)
            ->first();

        $passwordHash = $learner?->password
            ?? (string) config('security.learner_auth.dummy_password_hash');
        try {
            $passwordIsValid = Hash::check($credentials['password'], $passwordHash);
        } catch (RuntimeException) {
            Hash::check(
                $credentials['password'],
                (string) config('security.learner_auth.dummy_password_hash'),
            );
            $passwordIsValid = false;
        }

        if (! $learner || ! $learner->is_active || ! $passwordIsValid) {
            throw ValidationException::withMessages([
                'learner_code' => ['The provided Learner credentials are incorrect.'],
            ]);
        }

        $plainToken = Str::random(64);
        [$session, $learner] = DB::transaction(function () use ($learner, $credentials, $plainToken): array {
            $learner = Learner::query()->lockForUpdate()->findOrFail($learner->id);
            $now = now();

            LearnerPortalRun::query()
                ->where('learner_id', $learner->id)
                ->where('status', LearnerPortalRun::ACTIVE_STATUS)
                ->where('expires_at', '<=', $now)
                ->update([
                    'status' => 'expired',
                    'ended_at' => $now,
                ]);

            $hasActivePortalRun = LearnerPortalRun::query()
                ->where('learner_id', $learner->id)
                ->where('status', LearnerPortalRun::ACTIVE_STATUS)
                ->where('expires_at', '>', $now)
                ->exists();

            if ($hasActivePortalRun) {
                throw ValidationException::withMessages([
                    'learner_code' => ['This test Learner is currently being used by a Page Portal.'],
                ]);
            }

            if (Hash::needsRehash($learner->password)) {
                $learner->forceFill(['password' => $credentials['password']])->save();
            }

            $session = LearnerSession::query()->create([
                'learner_id' => $learner->id,
                'token_hash' => hash('sha256', $plainToken),
                'session_type' => 'standard',
                'last_seen_at' => $now,
                'expires_at' => $now->copy()->addHours(max(
                    1,
                    (int) config('security.learner_auth.session_lifetime_hours', 12),
                )),
            ]);

            $maxActiveSessions = max(
                1,
                (int) config('security.learner_auth.max_active_sessions', 5),
            );
            $sessionsToRevoke = LearnerSession::query()
                ->where('learner_id', $learner->id)
                ->where('session_type', 'standard')
                ->whereNull('revoked_at')
                ->where('expires_at', '>', $now)
                ->orderByDesc('id')
                ->pluck('id')
                ->slice($maxActiveSessions)
                ->all();
            if ($sessionsToRevoke !== []) {
                LearnerSession::query()
                    ->whereKey($sessionsToRevoke)
                    ->update(['revoked_at' => $now]);
            }

            return [$session, $learner];
        });

        return $this->json([
            'token' => $plainToken,
            ...$this->serializeSession($session, $learner),
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);

        return $this->json($this->serializeSession($session, $session->learner));
    }

    public function destroy(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $session->forceFill(['revoked_at' => now()])->save();

        return $this->json(['signed_out' => true]);
    }

    private function serializeSession(LearnerSession $session, Learner $learner): array
    {
        $learner->loadMissing('progressState');
        $progress = $learner->progressState ?? LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::BASELINE_STAGE,
        ]);

        return [
            'learner' => [
                'id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'full_name' => implode(' ', array_filter([
                    $learner->first_name,
                    $learner->middle_name,
                    $learner->last_name,
                    $learner->suffix,
                ])),
                'first_name' => $learner->first_name,
                'account_purpose' => $learner->account_purpose,
                'school' => $learner->school?->name,
                'grade_level' => $learner->grade_level,
                'section' => $learner->section,
                'progress' => [
                    'stage' => $progress->stage,
                    'current_required_lesson_order' => $progress->current_required_lesson_order,
                ],
                'achievement_keys' => LearnerAchievement::query()
                    ->where('learner_id', $learner->id)
                    ->orderBy('awarded_at')
                    ->pluck('achievement_key')
                    ->all(),
            ],
            'session' => [
                'expires_at' => $session->expires_at->toIso8601String(),
            ],
        ];
    }

    /** @param array<string, mixed> $payload */
    private function json(array $payload): JsonResponse
    {
        return response()->json($payload)->withHeaders([
            'Cache-Control' => 'private, no-store',
            'Pragma' => 'no-cache',
        ]);
    }
}
