<?php

namespace App\Services;

use App\Models\LearnerSession;
use Illuminate\Http\Request;

final class LearnerSessionResolver
{
    public function resolve(Request $request): LearnerSession
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
}
