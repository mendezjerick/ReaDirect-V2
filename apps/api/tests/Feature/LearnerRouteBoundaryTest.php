<?php

namespace Tests\Feature;

use Illuminate\Routing\Route;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class LearnerRouteBoundaryTest extends TestCase
{
    public function test_learner_routes_remain_outside_staff_middleware(): void
    {
        $learnerRoutes = $this->learnerRoutes();

        $this->assertNotEmpty($learnerRoutes);

        $learnerRoutes->each(function (Route $route): void {
            $middleware = $route->gatherMiddleware();

            $this->assertNotContains('staff.auth', $middleware, $route->uri());
            $this->assertFalse(
                collect($middleware)->contains(
                    fn (string $entry): bool => str_starts_with(
                        $entry,
                        'staff.role',
                    ),
                ),
                "{$route->uri()} must not inherit a staff role guard.",
            );
        });
    }

    public function test_critical_learner_endpoints_remain_registered(): void
    {
        $registeredUris = $this->learnerRoutes()
            ->map(fn (Route $route): string => $route->uri())
            ->unique()
            ->values()
            ->all();

        $criticalUris = [
            'api/learners/login',
            'api/learners/session',
            'api/learners/assessments/part-one/start',
            'api/learners/assessments/part-two/current',
            'api/learners/assessments/final/part-one/start',
            'api/learners/assessments/final/part-two/current',
            'api/learners/learn-with-clara/letters/start',
            'api/learners/lessons/lesson-1/start',
            'api/learners/lessons/lesson-2/start',
            'api/learners/lessons/lesson-3/start',
            'api/learners/lessons/lesson-4/start',
            'api/learners/lessons/lesson-5/start',
            'api/learners/lessons/lesson-6/start',
            'api/learners/tts/activity-readiness',
        ];

        foreach ($criticalUris as $uri) {
            $this->assertContains($uri, $registeredUris);
        }
    }

    /**
     * @return Collection<int, Route>
     */
    private function learnerRoutes(): Collection
    {
        return collect(app('router')->getRoutes()->getRoutes())
            ->filter(
                fn (Route $route): bool => str_starts_with(
                    $route->uri(),
                    'api/learners/',
                ),
            )
            ->values();
    }
}
