<?php

return [
    'default' => env('MAIL_MAILER', 'log'),

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME', 'smtp'),
            'host' => env('MAIL_HOST', 'smtp.gmail.com'),
            'port' => (int) env('MAIL_PORT', 587),
            'username' => env('MAIL_USERNAME'),
            'password' => env('GMAIL_APP_PASSWORD'),
            'require_tls' => (bool) env('MAIL_REQUIRE_TLS', true),
            'auto_tls' => true,
            'timeout' => 10,
        ],
        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL', 'stderr'),
        ],
        'array' => [
            'transport' => 'array',
        ],
    ],

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'no-reply@readirect.local'),
        'name' => env('MAIL_FROM_NAME', 'ReaDirect'),
    ],

    'gmail' => [
        'app_password' => env('GMAIL_APP_PASSWORD'),
    ],
];
