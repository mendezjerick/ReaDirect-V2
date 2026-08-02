<?php

$csv = static fn (mixed $value): array => array_values(array_filter(array_map(
    static fn (string $item): string => trim($item),
    explode(',', (string) $value),
)));

$appHost = parse_url((string) env('APP_URL', 'http://127.0.0.1:8000'), PHP_URL_HOST);
$trustedHostNames = $csv(env(
    'TRUSTED_HOSTS',
    is_string($appHost) && $appHost !== '' ? $appHost : '127.0.0.1',
));

return [
    'force_https' => (bool) env('APP_FORCE_HTTPS', false),

    'trusted_hosts' => array_map(
        static fn (string $host): string => '^'.preg_quote($host, '/').'$',
        $trustedHostNames,
    ),

    'trusted_proxies' => $csv(env('TRUSTED_PROXIES', '127.0.0.1,::1')),

    'learner_auth' => [
        'login_ip_attempts_per_minute' => max(
            1,
            (int) env('LEARNER_LOGIN_IP_ATTEMPTS_PER_MINUTE', 60),
        ),
        'login_identifier_attempts_per_minute' => max(
            1,
            (int) env('LEARNER_LOGIN_IDENTIFIER_ATTEMPTS_PER_MINUTE', 5),
        ),
        'session_lifetime_hours' => max(
            1,
            (int) env('LEARNER_SESSION_LIFETIME_HOURS', 12),
        ),
        'session_idle_timeout_minutes' => max(
            1,
            (int) env('LEARNER_SESSION_IDLE_TIMEOUT_MINUTES', 60),
        ),
        'session_touch_interval_seconds' => max(
            1,
            (int) env('LEARNER_SESSION_TOUCH_INTERVAL_SECONDS', 60),
        ),
        'max_active_sessions' => max(
            1,
            (int) env('LEARNER_MAX_ACTIVE_SESSIONS', 5),
        ),
        'dummy_password_hash' => '$2y$12$ntG2V17q1Nm1r2e84gaE3ObuCtmvQ2PojMq11mx02pmIOHqR1ZA6y',
    ],

    'staff_auth' => [
        'verification_code_expiry_minutes' => max(
            1,
            (int) env('STAFF_VERIFICATION_CODE_EXPIRY_MINUTES', 10),
        ),
        'verification_code_resend_seconds' => max(
            1,
            (int) env('STAFF_VERIFICATION_CODE_RESEND_SECONDS', 60),
        ),
        'verification_code_max_attempts' => max(
            1,
            (int) env('STAFF_VERIFICATION_CODE_MAX_ATTEMPTS', 5),
        ),
        'code_requests_per_ten_minutes' => max(
            1,
            (int) env('STAFF_CODE_REQUESTS_PER_TEN_MINUTES', 3),
        ),
        'code_attempts_per_ten_minutes' => max(
            1,
            (int) env('STAFF_CODE_ATTEMPTS_PER_TEN_MINUTES', 10),
        ),
    ],

    'headers' => [
        'hsts_enabled' => (bool) env(
            'SECURITY_HSTS_ENABLED',
            env('APP_FORCE_HTTPS', false),
        ),
        'hsts_max_age' => max(0, (int) env('SECURITY_HSTS_MAX_AGE', 31536000)),
        'hsts_include_subdomains' => (bool) env('SECURITY_HSTS_INCLUDE_SUBDOMAINS', false),
    ],
];
