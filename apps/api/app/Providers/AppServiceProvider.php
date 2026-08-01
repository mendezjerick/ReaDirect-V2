<?php

namespace App\Providers;

use Illuminate\Console\Events\CommandStarting;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use LogicException;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Application bindings will be registered alongside their owning feature.
    }

    public function boot(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        Event::listen(CommandStarting::class, function (CommandStarting $event): void {
            if (! in_array($event->command, [
                'migrate:fresh',
                'migrate:refresh',
                'db:wipe',
            ], true)) {
                return;
            }

            throw new LogicException(
                "{$event->command} is permanently disabled for ReaDirect. "
                .'Use additive migrations and approved rollback procedures only.',
            );
        });
    }
}
