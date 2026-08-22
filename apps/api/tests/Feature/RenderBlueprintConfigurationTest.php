<?php

namespace Tests\Feature;

use Tests\TestCase;

final class RenderBlueprintConfigurationTest extends TestCase
{
    public function test_production_cors_includes_the_capacitor_android_origin(): void
    {
        $blueprint = file_get_contents(base_path('../../render.yaml'));

        self::assertIsString($blueprint);
        self::assertStringContainsString(
            'value: https://app.readirect.org,https://readirect.org,https://www.readirect.org,https://readirect-production.pages.dev,https://localhost',
            $blueprint,
        );
        self::assertStringNotContainsString('CORS_ALLOWED_ORIGINS' . PHP_EOL . '        value: *', $blueprint);
    }
}
