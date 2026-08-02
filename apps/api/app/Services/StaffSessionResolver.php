<?php

namespace App\Services;

use App\Models\StaffSession;
use Illuminate\Http\Request;

final class StaffSessionResolver
{
    public function resolve(Request $request): StaffSession
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            abort(401, 'Staff session is required.');
        }

        $session = StaffSession::query()
            ->with(['staffUser.school:id,name'])
            ->where('token_hash', hash('sha256', $plainToken))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $session || ! $session->staffUser->is_active) {
            abort(401, 'The staff session has expired or was revoked.');
        }

        if ($session->remembered) {
            $deviceId = $request->header('X-ReaDirect-Device');
            $deviceHash = is_string($deviceId)
                ? hash_hmac('sha256', $deviceId, (string) config('app.key'))
                : '';
            if (! is_string($session->device_hash)
                || ! hash_equals($session->device_hash, $deviceHash)) {
                $session->forceFill(['revoked_at' => now()])->save();
                abort(401, 'The staff session has expired or was revoked.');
            }
        }

        if ($session->staffUser->role === 'system_admin') {
            $canonicalSessionId = StaffSession::query()
                ->whereHas('staffUser', fn ($query) => $query->where('role', 'system_admin'))
                ->whereNull('revoked_at')
                ->where('expires_at', '>', now())
                ->latest('id')
                ->value('id');

            if ($canonicalSessionId !== $session->id) {
                $session->forceFill(['revoked_at' => now()])->save();
                abort(401, 'The staff session has expired or was revoked.');
            }
        }

        return $session;
    }
}
