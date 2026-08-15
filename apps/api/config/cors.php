<?php

return [
    /*
    |--------------------------------------------------------------------------
    | CORS paths
    |--------------------------------------------------------------------------
    |
    | The Android WebView and approved browser frontends only need access to
    | application API routes. Static assets and non-API web responses remain
    | outside this policy.
    |
    */
    'paths' => ['api/*'],

    /*
    |--------------------------------------------------------------------------
    | Allowed origins
    |--------------------------------------------------------------------------
    |
    | Keep this empty by default. Deployment environments must provide an
    | explicit comma-separated CORS_ALLOWED_ORIGINS value after verifying the
    | actual Capacitor WebView Origin. Never use a wildcard here.
    |
    */
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_methods' => [
        'GET',
        'HEAD',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
    ],

    'allowed_headers' => [
        'Accept',
        'Authorization',
        'Content-Type',
        'Origin',
        'X-Requested-With',
        'X-ReaDirect-Device',
    ],

    'exposed_headers' => [],
    'max_age' => 600,
    'supports_credentials' => true,
];
