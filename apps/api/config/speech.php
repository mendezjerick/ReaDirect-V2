<?php

return [
    'asr_url' => env('ASR_SERVICE_URL', 'http://127.0.0.1:8001'),
    'connect_timeout_seconds' => (int) env('ASR_CONNECT_TIMEOUT_SECONDS', 3),
    'request_timeout_seconds' => (int) env('ASR_REQUEST_TIMEOUT_SECONDS', 180),
];
