<?php

namespace ReaDirect\Games\GameOne;

use Illuminate\Support\ServiceProvider;

final class GameOneServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}
