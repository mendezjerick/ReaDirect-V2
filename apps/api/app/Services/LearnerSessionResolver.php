<?php

namespace App\Services;

use App\Models\LearnerSession;
use Illuminate\Http\Request;

final class LearnerSessionResolver
{
    public const REQUEST_ATTRIBUTE = 'readirect.learner_session';

    public function resolve(Request $request): LearnerSession
    {
        $resolved = $request->attributes->get(self::REQUEST_ATTRIBUTE);
        if ($resolved instanceof LearnerSession) {
            return $resolved;
        }

        $plainToken = $request->bearerToken();

        if (! is_string($plainToken) || ! preg_match('/^[A-Za-z0-9_-]{8,128}$/', $plainToken)) {
            $this->unauthorized();
        }

        $session = LearnerSession::query()
            ->with(['learner.progressState'])
            ->where('token_hash', hash('sha256', $plainToken))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $session || ! $session->learner->is_active) {
            $this->unauthorized();
        }

        $now = now();
        $lastActivity = $session->last_seen_at ?? $session->created_at;
        $idleTimeoutMinutes = max(
            1,
            (int) config('security.learner_auth.session_idle_timeout_minutes', 60),
        );
        if ($lastActivity === null || $lastActivity->lte($now->copy()->subMinutes($idleTimeoutMinutes))) {
            $session->forceFill(['revoked_at' => $now])->save();
            $this->unauthorized();
        }

        $touchIntervalSeconds = max(
            1,
            (int) config('security.learner_auth.session_touch_interval_seconds', 60),
        );
        if ($session->last_seen_at === null
            || $session->last_seen_at->lte($now->copy()->subSeconds($touchIntervalSeconds))) {
            $session->forceFill(['last_seen_at' => $now])->save();
        }

        $request->attributes->set(self::REQUEST_ATTRIBUTE, $session);

        return $session;
    }

    private function unauthorized(): never
    {
        abort(
            401,
            'Learner authentication is required.',
            [
                'WWW-Authenticate' => 'Bearer',
                'Cache-Control' => 'no-store, private',
                'Pragma' => 'no-cache',
            ],
        );
    }
}
