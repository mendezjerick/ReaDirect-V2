<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAsrAvailable
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('pilot.asr_available', true)) {
            return new JsonResponse([
                'message' => (string) config(
                    'pilot.asr_unavailable_message',
                    'ASR is unavailable during pilot testing.',
                ),
                'code' => 'pilot_asr_unavailable',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return $next($request);
    }
}
