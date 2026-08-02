<?php

namespace App\Providers;

use App\Models\LearnerProgressState;
use App\Observers\LearnerProgressStateObserver;
use App\Support\DeploymentSecurity;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
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
        app(DeploymentSecurity::class)->assertSafe($this->app->environment());

        if (config('security.force_https')) {
            URL::forceScheme('https');
        }

        LearnerProgressState::observe(LearnerProgressStateObserver::class);

        RateLimiter::for('learner-login', function (Request $request): array {
            $normalizedCode = mb_strtoupper(mb_substr(
                trim((string) $request->input('learner_code', '')),
                0,
                32,
            ));

            return [
                Limit::perMinute((int) config(
                    'security.learner_auth.login_ip_attempts_per_minute',
                    60,
                ))->by('learner-login-ip:'.($request->ip() ?? 'unknown')),
                Limit::perMinute((int) config(
                    'security.learner_auth.login_identifier_attempts_per_minute',
                    5,
                ))->by('learner-login-code:'.hash('sha256', $normalizedCode)),
            ];
        });

        RateLimiter::for('staff-security-code-request', function (Request $request): Limit {
            return Limit::perMinutes(
                10,
                (int) config('security.staff_auth.code_requests_per_ten_minutes', 3),
            )->by('staff-security-code-request:'.($request->user()?->id ?? $request->ip() ?? 'unknown'));
        });

        RateLimiter::for('staff-security-code-verify', function (Request $request): Limit {
            return Limit::perMinutes(
                10,
                (int) config('security.staff_auth.code_attempts_per_ten_minutes', 10),
            )->by('staff-security-code-verify:'.($request->user()?->id ?? $request->ip() ?? 'unknown'));
        });

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
