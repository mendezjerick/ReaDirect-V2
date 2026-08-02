<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnforceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('security.force_https') && ! $request->secure()) {
            return new JsonResponse([
                'message' => 'HTTPS is required for this service.',
            ], Response::HTTP_UPGRADE_REQUIRED);
        }

        return $next($request);
    }
}
