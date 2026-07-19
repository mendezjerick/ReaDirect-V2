<?php

namespace ReaDirect\Games\GameTwo;

use Illuminate\Support\ServiceProvider;

final class GameTwoServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}
