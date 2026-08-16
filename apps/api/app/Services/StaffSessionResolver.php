<?php

namespace App\Services;

use App\Models\StaffSession;
use Illuminate\Http\Request;

final class StaffSessionResolver
{
    public const COOKIE_NAME = 'readirect_staff_session';
    public const MARKER_COOKIE_NAME = 'readirect_staff_signed_in';
    public const BROWSER_SESSION_SENTINEL = 'cookie-session';

    public function resolve(Request $request): StaffSession
    {
        $plainToken = $request->bearerToken();
        if ($plainToken === self::BROWSER_SESSION_SENTINEL) {
            $plainToken = null;
        }

        if (! is_string($plainToken) || ! preg_match('/^[A-Za-z0-9_-]{8,128}$/', $plainToken)) {
            $plainToken = $request->cookie(self::COOKIE_NAME);
        }

        if (! is_string($plainToken) || ! preg_match('/^[A-Za-z0-9_-]{8,128}$/', $plainToken)) {
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

        $now = now();
        $leaseCutoff = $now->copy()->subSeconds((int) config(
            'staff.non_remembered_session_lease_seconds',
            120,
        ));
        if (! $session->remembered
            && ($session->last_used_at === null || $session->last_used_at->lte($leaseCutoff))) {
            $session->forceFill(['revoked_at' => $now])->save();
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

        return $session;
    }
}
