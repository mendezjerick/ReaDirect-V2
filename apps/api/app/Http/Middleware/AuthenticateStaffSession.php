<?php

namespace App\Http\Middleware;

use App\Services\StaffSessionResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateStaffSession
{
    public function __construct(
        private readonly StaffSessionResolver $sessions,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $session = $this->sessions->resolve($request);
        $staffUser = $session->staffUser;

        $request->attributes->set('staff_session', $session);
        $request->attributes->set('staff_user', $staffUser);
        $request->setUserResolver(static fn () => $staffUser);

        $touchCutoff = now()->subSeconds((int) config(
            'staff.session_heartbeat_interval_seconds',
            30,
        ));
        if ($session->last_used_at === null || $session->last_used_at->lte($touchCutoff)) {
            $session->forceFill(['last_used_at' => now()])->save();
        }

        return $next($request);
    }
}
