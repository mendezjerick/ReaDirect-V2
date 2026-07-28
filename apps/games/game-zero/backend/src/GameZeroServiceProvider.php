<?php

namespace ReaDirect\Games\GameZero;

use Illuminate\Support\ServiceProvider;

final class GameZeroServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}
