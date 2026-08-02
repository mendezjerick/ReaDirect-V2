<?php

namespace ReaDirect\Games\GameAlpha;

use Illuminate\Support\ServiceProvider;

final class GameAlphaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}

