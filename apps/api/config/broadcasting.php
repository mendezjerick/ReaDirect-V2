<?php

$configuredSecret = env('REVERB_APP_SECRET');
$reverbSecret = is_string($configuredSecret) && trim($configuredSecret) !== ''
    ? $configuredSecret
    : hash_hmac(
        'sha256',
        'readirect-reverb-local-signing-v2',
        (string) env('APP_KEY', 'local-only'),
    );

return [
    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY', 'readirect-local'),
            'secret' => $reverbSecret,
            'app_id' => env('REVERB_APP_ID', 'readirect'),
            'options' => [
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
                'path' => env('REVERB_SERVER_PATH', ''),
            ],
            'client_options' => [],
        ],

        'null' => [
            'driver' => 'null',
        ],
    ],
];
