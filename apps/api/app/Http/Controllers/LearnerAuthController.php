<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class LearnerAuthController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'learner_code' => ['required', 'string', 'max:5'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $normalizedCode = mb_strtoupper(trim($credentials['learner_code']));
        $learner = Learner::query()
            ->whereRaw('UPPER(learner_code) = ?', [$normalizedCode])
            ->first();

        if (! $learner || ! $learner->is_active || ! Hash::check($credentials['password'], $learner->password)) {
            throw ValidationException::withMessages([
                'learner_code' => ['The provided Learner credentials are incorrect.'],
            ]);
        }

        LearnerPortalRun::query()
            ->where('learner_id', $learner->id)
            ->where('status', LearnerPortalRun::ACTIVE_STATUS)
            ->where('expires_at', '<=', now())
            ->update([
                'status' => 'expired',
                'ended_at' => now(),
            ]);

        $hasActivePortalRun = LearnerPortalRun::query()
            ->where('learner_id', $learner->id)
            ->where('status', LearnerPortalRun::ACTIVE_STATUS)
            ->where('expires_at', '>', now())
            ->exists();

        if ($hasActivePortalRun) {
            throw ValidationException::withMessages([
                'learner_code' => ['This test Learner is currently being used by a Page Portal.'],
            ]);
        }

        $plainToken = Str::random(64);
        $session = LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $plainToken),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHours(12),
        ]);

        return response()->json([
            'token' => $plainToken,
            ...$this->serializeSession($session, $learner),
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $session = $this->resolveSession($request);
        $session->forceFill(['last_seen_at' => now()])->save();

        return response()->json($this->serializeSession($session, $session->learner));
    }

    public function destroy(Request $request): JsonResponse
    {
        $session = $this->resolveSession($request);
        $session->forceFill(['revoked_at' => now()])->save();

        return response()->json(['signed_out' => true]);
    }

    private function resolveSession(Request $request): LearnerSession
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            abort(401, 'Learner session is required.');
        }

        $session = LearnerSession::query()
            ->with(['learner.progressState'])
            ->where('token_hash', hash('sha256', $plainToken))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $session || ! $session->learner->is_active) {
            abort(401, 'The Learner session has expired or was reset.');
        }

        return $session;
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
            ],
            'session' => [
                'expires_at' => $session->expires_at->toIso8601String(),
            ],
        ];
    }
}
