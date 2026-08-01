<?php

use App\Http\Middleware\AuthenticateStaffSession;
use App\Http\Middleware\RequireStaffRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

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
        $middleware->alias([
            'staff.auth' => AuthenticateStaffSession::class,
            'staff.role' => RequireStaffRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Keep Laravel's standard JSON exception rendering for API routes.
    })
    ->create();
