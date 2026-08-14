<?php

namespace Tests\Feature;

use Tests\TestCase;

final class CorsConfigurationTest extends TestCase
{
    public function test_approved_origin_receives_preflight_headers(): void
    {
        config([
            'cors.allowed_origins' => [
                'https://localhost',
                'https://web.example.test',
            ],
        ]);

        $response = $this->withHeaders([
            'Origin' => 'https://localhost',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'Authorization, Content-Type',
        ])->options('/api/learners/assessments/diagnostic/skip');

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://localhost')
            ->assertHeader('Access-Control-Allow-Methods')
            ->assertHeader('Access-Control-Allow-Headers');
    }

    public function test_unapproved_origin_does_not_receive_cors_access(): void
    {
        config([
            'cors.allowed_origins' => [
                'https://localhost',
                'https://web.example.test',
            ],
        ]);

        $response = $this->withHeaders([
            'Origin' => 'https://untrusted.example.test',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'Authorization, Content-Type',
        ])->options('/api/learners/assessments/diagnostic/skip');

        $response
            ->assertNoContent()
            ->assertHeaderMissing('Access-Control-Allow-Origin');
    }
}
