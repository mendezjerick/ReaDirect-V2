<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Route guards are intentionally deferred during dashboard prototyping.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Keep Laravel's standard JSON exception rendering for API routes.
    })
    ->create();
