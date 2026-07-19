<?php

use Illuminate\Support\Facades\Route;

Route::prefix('api/learner/games/game-two')
    ->middleware('api')
    ->group(function (): void {
        // Add only game-specific endpoints. Shared session, save, score,
        // leaderboard, username, and achievement endpoints remain core-owned.
    });
