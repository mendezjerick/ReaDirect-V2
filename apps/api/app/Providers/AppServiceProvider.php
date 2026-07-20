<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Application bindings will be registered as features are added.
    }

    public function boot(): void
    {
        // Application boot rules will be added alongside their owning feature.
    }
}
