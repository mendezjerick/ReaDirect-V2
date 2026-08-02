<?php

return [
    'session_lifetime_hours' => (int) env('STAFF_SESSION_LIFETIME_HOURS', 8),
    'remembered_session_lifetime_days' => max(
        1,
        (int) env('STAFF_REMEMBERED_SESSION_LIFETIME_DAYS', 30),
    ),
];
