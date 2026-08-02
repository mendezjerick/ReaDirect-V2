<?php

$allowedOrigins = array_values(array_filter(array_map(
    static fn (string $origin): string => trim($origin),
    explode(',', (string) env(
        'REVERB_ALLOWED_ORIGINS',
        '127.0.0.1,localhost,staging.readirect.org',
    )),
)));
$configuredSecret = env('REVERB_APP_SECRET');
$appSecret = is_string($configuredSecret) && trim($configuredSecret) !== ''
    ? $configuredSecret
    : hash_hmac(
        'sha256',
        'readirect-reverb-local-signing-v2',
        (string) env('APP_KEY', 'local-only'),
    );
$configuredMaxConnections = (int) env('REVERB_APP_MAX_CONNECTIONS', 250);

return [
    'default' => env('REVERB_SERVER', 'reverb'),

    'monitoring' => [
        'queue_warning_depth' => (int) env('REVERB_QUEUE_WARNING_DEPTH', 25),
        'oldest_job_warning_seconds' => (int) env('REVERB_OLDEST_JOB_WARNING_SECONDS', 30),
        'socket_connect_timeout_seconds' => (float) env('REVERB_HEALTH_CONNECT_TIMEOUT_SECONDS', 0.25),
    ],

    'servers' => [
        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '127.0.0.1'),
            'port' => (int) env('REVERB_SERVER_PORT', 8080),
            'path' => env('REVERB_SERVER_PATH', ''),
            'hostname' => env('REVERB_HOST', '127.0.0.1'),
            'options' => ['tls' => []],
            'max_request_size' => (int) env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'scaling' => [
                'enabled' => false,
                'channel' => 'reverb',
                'server' => [],
            ],
            'pulse_ingest_interval' => 15,
            'telescope_ingest_interval' => 15,
        ],
    ],

    'apps' => [
        'provider' => 'config',
        'apps' => [
            [
                'key' => env('REVERB_APP_KEY', 'readirect-local'),
                'secret' => $appSecret,
                'app_id' => env('REVERB_APP_ID', 'readirect'),
                'options' => [
                    'host' => env('REVERB_HOST', '127.0.0.1'),
                    'port' => (int) env('REVERB_PORT', 8080),
                    'scheme' => env('REVERB_SCHEME', 'http'),
                    'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
                ],
                'allowed_origins' => $allowedOrigins,
                'ping_interval' => (int) env('REVERB_APP_PING_INTERVAL', 60),
                'activity_timeout' => (int) env('REVERB_APP_ACTIVITY_TIMEOUT', 30),
                'max_connections' => $configuredMaxConnections > 0 ? $configuredMaxConnections : null,
                'max_message_size' => (int) env('REVERB_APP_MAX_MESSAGE_SIZE', 4096),
                'accept_client_events_from' => 'none',
                'rate_limiting' => [
                    'enabled' => true,
                    'max_attempts' => (int) env('REVERB_APP_RATE_LIMIT_MAX_ATTEMPTS', 120),
                    'decay_seconds' => (int) env('REVERB_APP_RATE_LIMIT_DECAY_SECONDS', 60),
                    'terminate_on_limit' => (bool) env('REVERB_APP_RATE_LIMIT_TERMINATE', true),
                ],
            ],
        ],
    ],
];
