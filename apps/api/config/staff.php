<?php

$heartbeatIntervalSeconds = max(
    10,
    (int) env('STAFF_SESSION_HEARTBEAT_INTERVAL_SECONDS', 30),
);

return [
    'session_lifetime_hours' => (int) env('STAFF_SESSION_LIFETIME_HOURS', 8),
    'session_heartbeat_interval_seconds' => $heartbeatIntervalSeconds,
    'non_remembered_session_lease_seconds' => max(
        $heartbeatIntervalSeconds * 3,
        (int) env('STAFF_NON_REMEMBERED_SESSION_LEASE_SECONDS', 120),
    ),
    'remembered_session_lifetime_days' => max(
        1,
        (int) env('STAFF_REMEMBERED_SESSION_LIFETIME_DAYS', 30),
    ),
];
