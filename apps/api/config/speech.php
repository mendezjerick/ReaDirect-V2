<?php

return [
    'asr_url' => env('ASR_SERVICE_URL', 'http://127.0.0.1:8001'),
    'connect_timeout_seconds' => (int) env('ASR_CONNECT_TIMEOUT_SECONDS', 3),
    'request_timeout_seconds' => (int) env('ASR_REQUEST_TIMEOUT_SECONDS', 180),
    'tts_url' => env('TTS_SERVICE_URL', 'http://127.0.0.1:8002'),
    'tts_connect_timeout_seconds' => (int) env('TTS_CONNECT_TIMEOUT_SECONDS', 3),
    'tts_request_timeout_seconds' => (int) env('TTS_REQUEST_TIMEOUT_SECONDS', 300),
    'clara_lines' => [
        'lesson-intro' => [
            'text' => 'Hi! I am happy you are here. Let us get ready to read together!',
            'reference' => 'introduce',
        ],
        'assessment-orientation' => [
            'text' => 'Let us check your microphone. Say ready, then listen to your recording.',
            'reference' => 'instruction',
        ],
        'assessment-letters' => [
            'text' => 'Say the letter you see. Listen to your voice before you submit.',
            'reference' => 'instruction',
        ],
        'assessment-rhymes' => [
            'text' => 'Look at both words. Choose yes if they rhyme, or no if they do not.',
            'reference' => 'question',
        ],
        'assessment-words' => [
            'text' => 'Read the word you see. Listen to your voice before you submit.',
            'reference' => 'instruction',
        ],
        'assessment-part-one-result' => [
            'text' => 'Part one is complete. You worked hard, and I am proud of you!',
            'reference' => 'result',
        ],
    ],
    'assessment_item_cues' => [
        'ordinals' => [
            2 => 'second',
            3 => 'third',
            4 => 'fourth',
            5 => 'fifth',
            6 => 'sixth',
            7 => 'seventh',
            8 => 'eighth',
            9 => 'ninth',
            10 => 'tenth',
        ],
        'tasks' => [
            'letters' => [
                'text' => 'Now, try the %s letter.',
                'reference' => 'instruction',
            ],
            'rhymes' => [
                'text' => 'Now, check the %s pair.',
                'reference' => 'question',
            ],
            'words' => [
                'text' => 'Now, read the %s word.',
                'reference' => 'instruction',
            ],
        ],
    ],
];
