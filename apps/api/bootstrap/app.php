<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\AuthenticateLearnerSession;
use App\Http\Middleware\AuthenticateStaffSession;
use App\Http\Middleware\EnforceHttps;
use App\Http\Middleware\EnsureAsrAvailable;
use App\Http\Middleware\RequireStaffRole;
use App\Http\Middleware\TrustHosts;
use App\Http\Middleware\TrustProxies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\TrustProxies as FrameworkTrustProxies;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        [
            'prefix' => 'api/staff',
            'middleware' => ['api', 'staff.auth'],
        ],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->replace(FrameworkTrustProxies::class, TrustProxies::class);
        $middleware->append([
            TrustHosts::class,
            AddSecurityHeaders::class,
            EnforceHttps::class,
        ]);

        $middleware->alias([
            'learner.auth' => AuthenticateLearnerSession::class,
            'staff.auth' => AuthenticateStaffSession::class,
            'staff.role' => RequireStaffRole::class,
            'asr.available' => EnsureAsrAvailable::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Keep Laravel's standard JSON exception rendering for API routes.
    })
    ->create();
