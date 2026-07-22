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
            'path' => 'lesson-intro/lesson-intro.wav',
        ],
        'assessment-orientation' => [
            'text' => 'Let us check your microphone. Say ready, then listen to your recording.',
            'reference' => 'instruction',
            'path' => 'part-1/orientation/assessment-orientation.wav',
        ],
        'assessment-letters' => [
            'text' => 'Say the letter you see. Listen to your voice before you submit.',
            'reference' => 'instruction',
            'path' => 'part-1/task-1a/assessment-letters.wav',
        ],
        'assessment-rhymes' => [
            'text' => 'Look at both words. Choose yes if they rhyme, or no if they do not.',
            'reference' => 'question',
            'path' => 'part-1/task-2a/assessment-rhymes.wav',
        ],
        'assessment-words' => [
            'text' => 'Read the word you see. Listen to your voice before you submit.',
            'reference' => 'instruction',
            'path' => 'part-1/task-2b/assessment-words.wav',
        ],
        'assessment-part-one-result' => [
            'text' => 'Part one is complete. You worked hard, and I am proud of you!',
            'reference' => 'result',
            'path' => 'part-1/results/assessment-part-one-result.wav',
        ],
        'assessment-story-choice' => [
            'text' => 'Choose the story you want to read. You can pick Lena at the Park or Rosa in the Garden.',
            'reference' => 'question',
            'path' => 'part-2/story-choice/assessment-story-choice.wav',
        ],
        'assessment-passage' => [
            'text' => 'Read the story aloud. You have one minute. You can submit when you finish.',
            'reference' => 'instruction',
            'path' => 'part-2/passage/assessment-passage.wav',
        ],
        'assessment-comprehension-lena-item-1' => [
            'text' => 'Choose the best answer. Who goes to the park?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-lena-item-1.wav',
        ],
        'assessment-comprehension-lena-item-2' => [
            'text' => 'What does Lena take?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-lena-item-2.wav',
        ],
        'assessment-comprehension-lena-item-3' => [
            'text' => 'Where does Lena go?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-lena-item-3.wav',
        ],
        'assessment-comprehension-lena-item-4' => [
            'text' => 'When does Lena go to the park?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-lena-item-4.wav',
        ],
        'assessment-comprehension-lena-item-5' => [
            'text' => 'Why does Lena go to the park?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-lena-item-5.wav',
        ],
        'assessment-comprehension-rosa-item-1' => [
            'text' => 'Choose the best answer. Who goes to the garden?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-rosa-item-1.wav',
        ],
        'assessment-comprehension-rosa-item-2' => [
            'text' => 'What does Rosa pick?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-rosa-item-2.wav',
        ],
        'assessment-comprehension-rosa-item-3' => [
            'text' => 'Where does Rosa go?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-rosa-item-3.wav',
        ],
        'assessment-comprehension-rosa-item-4' => [
            'text' => 'When does Rosa go to the garden?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-rosa-item-4.wav',
        ],
        'assessment-comprehension-rosa-item-5' => [
            'text' => 'Why does Rosa go to the garden?',
            'reference' => 'question',
            'path' => 'part-2/comprehension/assessment-comprehension-rosa-item-5.wav',
        ],
        'assessment-part-two-result' => [
            'text' => 'Part two is complete. You finished reading and understanding the story.',
            'reference' => 'result',
            'path' => 'part-2/results/assessment-part-two-result.wav',
        ],
        'assessment-complete' => [
            'text' => 'Assessment complete! Your first lesson is ready.',
            'reference' => 'result',
            'path' => 'completion/assessment-complete.wav',
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
                'path' => 'part-1/task-1a',
            ],
            'rhymes' => [
                'text' => 'Now, check the %s pair.',
                'reference' => 'question',
                'path' => 'part-1/task-2a',
            ],
            'words' => [
                'text' => 'Now, read the %s word.',
                'reference' => 'instruction',
                'path' => 'part-1/task-2b',
            ],
        ],
    ],
];
