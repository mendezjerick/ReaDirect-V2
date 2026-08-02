<?php

namespace App\Http\Middleware;

use App\Services\LearnerSessionResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateLearnerSession
{
    public function __construct(
        private readonly LearnerSessionResolver $sessions,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->sessions->resolve($request);

        $response = $next($request);
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('Pragma', 'no-cache');

        return $response;
    }
}
