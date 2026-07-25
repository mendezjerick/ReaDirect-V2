<?php

namespace App\Http\Middleware;

use App\Models\StaffUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequireStaffRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $staffUser = $request->user();

        if (! $staffUser instanceof StaffUser || ! in_array($staffUser->role, $roles, true)) {
            abort(403, 'This staff account cannot access that workspace.');
        }

        $routeStaffUser = $request->route('staffUser');
        if ($routeStaffUser !== null) {
            $routeStaffUserId = $routeStaffUser instanceof StaffUser
                ? $routeStaffUser->id
                : (int) $routeStaffUser;

            if ($routeStaffUserId !== $staffUser->id) {
                abort(403, 'A staff account cannot act as another staff user.');
            }
        }

        return $next($request);
    }
}
