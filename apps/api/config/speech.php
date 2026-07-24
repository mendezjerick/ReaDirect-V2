<?php

use App\Services\IsolatedLetterPronunciation;

$assessmentPartOneSpeechKeys = [
    'assessment-orientation',
    'assessment-letters',
    'assessment-rhymes',
    'assessment-words',
    'assessment-part-one-result',
];

foreach (['letters', 'rhymes', 'words'] as $task) {
    foreach (range(2, 10) as $position) {
        $assessmentPartOneSpeechKeys[] = "assessment-{$task}-item-{$position}";
    }
}

$assessmentPartTwoSpeechKeys = [
    'assessment-story-choice',
    'assessment-passage',
    ...array_map(
        fn (int $position): string => "assessment-comprehension-lena-item-{$position}",
        range(1, 5),
    ),
    ...array_map(
        fn (int $position): string => "assessment-comprehension-rosa-item-{$position}",
        range(1, 5),
    ),
    'assessment-part-two-result',
    'assessment-complete',
];

$lessonOneSupportLines = [
    'lesson-1-technical-retry' => [
        'text' => 'I could not hear that clearly. Let us try once more.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-1/support/technical/lesson-1-technical-retry.wav',
    ],
    'lesson-1-clue-mission-1' => [
        'text' => 'Look at the big letter and the small letter. They share one letter name.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-1/support/clues/lesson-1-clue-mission-1.wav',
    ],
    'lesson-1-clue-mission-2' => [
        'text' => 'Look at the very first letter in the word. Say only that letter name.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-1/support/clues/lesson-1-clue-mission-2.wav',
    ],
    'lesson-1-clue-mission-3' => [
        'text' => 'Look at the blank at the start. Say the letter that completes the word.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-1/support/clues/lesson-1-clue-mission-3.wav',
    ],
    'lesson-1-feedback-independent' => [
        'text' => 'That is correct. You found it by yourself.',
        'reference' => 'result',
        'path' => 'lessons/lesson-1/support/feedback/lesson-1-feedback-independent.wav',
    ],
    'lesson-1-feedback-supported' => [
        'text' => 'That is correct. The clue helped you find it.',
        'reference' => 'result',
        'path' => 'lessons/lesson-1/support/feedback/lesson-1-feedback-supported.wav',
    ],
    'lesson-1-feedback-demonstrated' => [
        'text' => 'Good echo. We will practice this letter again later.',
        'reference' => 'result',
        'path' => 'lessons/lesson-1/support/feedback/lesson-1-feedback-demonstrated.wav',
    ],
    'lesson-1-feedback-not-yet' => [
        'text' => 'Not yet, and that is okay. We will practice this letter again.',
        'reference' => 'result',
        'path' => 'lessons/lesson-1/support/feedback/lesson-1-feedback-not-yet.wav',
    ],
    'lesson-1-feedback-unscorable' => [
        'text' => 'I still could not hear a clear answer. We can try this letter again later.',
        'reference' => 'result',
        'path' => 'lessons/lesson-1/support/feedback/lesson-1-feedback-unscorable.wav',
    ],
];

$lessonTwoSupportLines = [
    'lesson-2-technical-retry' => [
        'text' => 'I could not hear that clearly. Let us try the word once more.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-2/support/technical/lesson-2-technical-retry.wav',
    ],
    'lesson-2-clue-mission-1' => [
        'text' => 'Look at each letter from left to right. Blend the sounds, then say the whole word.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-2/support/clues/lesson-2-clue-mission-1.wav',
    ],
    'lesson-2-clue-mission-2' => [
        'text' => 'Look at the highlighted word in the sentence. Say only that word.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-2/support/clues/lesson-2-clue-mission-2.wav',
    ],
    'lesson-2-feedback-independent' => [
        'text' => 'That is correct. You read the word by yourself.',
        'reference' => 'result',
        'path' => 'lessons/lesson-2/support/feedback/lesson-2-feedback-independent.wav',
    ],
    'lesson-2-feedback-supported' => [
        'text' => 'That is correct. The clue helped you read the word.',
        'reference' => 'result',
        'path' => 'lessons/lesson-2/support/feedback/lesson-2-feedback-supported.wav',
    ],
    'lesson-2-feedback-demonstrated' => [
        'text' => 'Good echo. We will practice this word again later.',
        'reference' => 'result',
        'path' => 'lessons/lesson-2/support/feedback/lesson-2-feedback-demonstrated.wav',
    ],
    'lesson-2-feedback-not-yet' => [
        'text' => 'Not yet, and that is okay. We will practice this word again.',
        'reference' => 'result',
        'path' => 'lessons/lesson-2/support/feedback/lesson-2-feedback-not-yet.wav',
    ],
    'lesson-2-feedback-unscorable' => [
        'text' => 'I still could not hear a clear answer. We can try this word again later.',
        'reference' => 'result',
        'path' => 'lessons/lesson-2/support/feedback/lesson-2-feedback-unscorable.wav',
    ],
];

$learnWithClaraLessonOneGreetingLines = [
    'learn-with-clara-lesson-1-greeting-morning' => [
        'text' => 'Good morning. I am happy you are here. I have a little story for you today.',
        'reference' => 'introduce',
        'path' => 'learn-with-clara/lesson-1/greetings/morning.wav',
    ],
    'learn-with-clara-lesson-1-greeting-afternoon' => [
        'text' => 'Good afternoon. I am glad you are here. Let us learn and share a little story.',
        'reference' => 'introduce',
        'path' => 'learn-with-clara/lesson-1/greetings/afternoon.wav',
    ],
    'learn-with-clara-lesson-1-greeting-evening' => [
        'text' => 'Good evening. Let us slow down and enjoy a little story together.',
        'reference' => 'introduce',
        'path' => 'learn-with-clara/lesson-1/greetings/evening.wav',
    ],
];

$learnWithClaraLessonOneChapterOneLines = [
    'learn-with-clara-lesson-1-pair-a' => [
        'text' => 'Meet the big and small shapes for ei. Their letter name is ei.',
        'reference' => 'instruction',
        'path' => 'learn-with-clara/lesson-1/chapter-1/items/pair-a.wav',
    ],
    'learn-with-clara-lesson-1-pair-b' => [
        'text' => 'Meet the big and small shapes for bee. Their letter name is bee.',
        'reference' => 'instruction',
        'path' => 'learn-with-clara/lesson-1/chapter-1/items/pair-b.wav',
    ],
    'learn-with-clara-lesson-1-pair-c' => [
        'text' => 'Meet the big and small shapes for see. Their letter name is see.',
        'reference' => 'instruction',
        'path' => 'learn-with-clara/lesson-1/chapter-1/items/pair-c.wav',
    ],
    'learn-with-clara-lesson-1-pair-d' => [
        'text' => 'Meet the big and small shapes for dee. Their letter name is dee.',
        'reference' => 'instruction',
        'path' => 'learn-with-clara/lesson-1/chapter-1/items/pair-d.wav',
    ],
    'learn-with-clara-lesson-1-pair-e' => [
        'text' => 'Meet the big and small shapes for ee. Their letter name is ee.',
        'reference' => 'instruction',
        'path' => 'learn-with-clara/lesson-1/chapter-1/items/pair-e.wav',
    ],
    'learn-with-clara-lesson-1-story-name-opening' => [
        'text' => 'When I first learned to write Clara, I made the C so big that it nearly filled the page. I felt proud, until I saw the tiny space left for the other letters.',
        'reference' => 'introduce',
        'path' => 'learn-with-clara/lesson-1/chapter-1/story/name-opening.wav',
    ],
    'learn-with-clara-lesson-1-story-name-detail' => [
        'text' => 'I squeezed the other letters into the corner. They became smaller and smaller, like little ants running from the giant C. I laughed at my funny name.',
        'reference' => 'introduce',
        'path' => 'learn-with-clara/lesson-1/chapter-1/story/name-detail.wav',
    ],
    'learn-with-clara-lesson-1-story-name-close' => [
        'text' => 'My teacher gave me a fresh page. This time, I gave every letter enough room. I kept the funny first page because mistakes can become good stories.',
        'reference' => 'introduce',
        'path' => 'learn-with-clara/lesson-1/chapter-1/story/name-close.wav',
    ],
    'learn-with-clara-lesson-1-story-name-return' => [
        'text' => 'That was a funny memory. Now, let us go back to our letters.',
        'reference' => 'introduce',
        'path' => 'learn-with-clara/lesson-1/chapter-1/story/name-return.wav',
    ],
    'learn-with-clara-lesson-1-chapter-1-complete' => [
        'text' => 'That was our first little letter class. Thank you for listening with me.',
        'reference' => 'result',
        'path' => 'learn-with-clara/lesson-1/chapter-1/completion/chapter-1-complete.wav',
    ],
];

$lessonOneItemCueLines = [];
$lessonOneItemOrdinals = [
    2 => 'second',
    3 => 'third',
    4 => 'fourth',
    5 => 'fifth',
];
$lessonOneMissionCueTemplates = [
    'mission-1' => 'Now, try the %s letter.',
    'mission-2' => 'Now, find the first letter in the %s word.',
    'mission-3' => 'Now, complete the %s word.',
];

foreach ($lessonOneMissionCueTemplates as $missionKey => $template) {
    foreach ($lessonOneItemOrdinals as $position => $ordinal) {
        $speechKey = "lesson-1-{$missionKey}-item-{$position}";
        $lessonOneItemCueLines[$speechKey] = [
            'text' => sprintf($template, $ordinal),
            'reference' => 'instruction',
            'path' => "lessons/lesson-1/{$missionKey}/{$speechKey}.wav",
        ];
    }
}

$lessonTwoItemCueLines = [];
$lessonTwoMissionCueTemplates = [
    'mission-1' => 'Now, read the %s word.',
    'mission-2' => 'Now, find and read the %s highlighted word.',
];

foreach ($lessonTwoMissionCueTemplates as $missionKey => $template) {
    foreach ($lessonOneItemOrdinals as $position => $ordinal) {
        $speechKey = "lesson-2-{$missionKey}-item-{$position}";
        $lessonTwoItemCueLines[$speechKey] = [
            'text' => sprintf($template, $ordinal),
            'reference' => 'instruction',
            'path' => "lessons/lesson-2/{$missionKey}/{$speechKey}.wav",
        ];
    }
}

foreach (IsolatedLetterPronunciation::all() as $letter => $spokenForm) {
    $lessonOneSupportLines["lesson-1-letter-demo-{$letter}"] = [
        'text' => "The letter name is {$spokenForm}. Listen: {$spokenForm}. Now you try.",
        'reference' => 'instruction',
        'path' => "lessons/lesson-1/support/demonstrations/lesson-1-letter-demo-{$letter}.wav",
    ];
}

return [
    'asr_url' => env('ASR_SERVICE_URL', 'http://127.0.0.1:8001'),
    'connect_timeout_seconds' => (int) env('ASR_CONNECT_TIMEOUT_SECONDS', 3),
    'request_timeout_seconds' => (int) env('ASR_REQUEST_TIMEOUT_SECONDS', 180),
    'tts_url' => env('TTS_SERVICE_URL', 'http://127.0.0.1:8002'),
    'tts_connect_timeout_seconds' => (int) env('TTS_CONNECT_TIMEOUT_SECONDS', 3),
    'tts_request_timeout_seconds' => (int) env('TTS_REQUEST_TIMEOUT_SECONDS', 300),
    'tts_reference_profiles' => [
        'introduce',
        'instruction',
        'question',
        'result',
    ],
    'published_speech_groups' => [
        'assessment-part-one-fixed' => $assessmentPartOneSpeechKeys,
        'assessment-part-two-fixed' => $assessmentPartTwoSpeechKeys,
        'lesson-1-fixed' => [
            'lesson-1-mission-1',
            'lesson-1-mission-2',
            'lesson-1-mission-3',
            'lesson-1-complete',
            ...array_keys($lessonOneItemCueLines),
            ...array_keys($lessonOneSupportLines),
        ],
        'lesson-2-fixed' => [
            'lesson-2-mission-1',
            'lesson-2-mission-2',
            'lesson-2-complete',
            ...array_keys($lessonTwoItemCueLines),
            ...array_keys($lessonTwoSupportLines),
        ],
        'learn-with-clara-lesson-1-fixed' => [
            ...array_keys($learnWithClaraLessonOneGreetingLines),
            ...array_keys($learnWithClaraLessonOneChapterOneLines),
        ],
    ],
    'activity_speech_manifests' => [
        'assessment-part-one' => [
            'published_groups' => ['assessment-part-one-fixed'],
            'runtime_profiles' => [],
        ],
        'assessment-part-two' => [
            'published_groups' => ['assessment-part-two-fixed'],
            'runtime_profiles' => [],
        ],
        'lesson-1' => [
            'published_groups' => ['lesson-1-fixed'],
            'runtime_profiles' => ['result'],
        ],
        'lesson-2' => [
            'published_groups' => ['lesson-2-fixed'],
            'runtime_profiles' => ['result', 'instruction'],
        ],
        'learn-with-clara-lesson-1' => [
            'published_groups' => ['learn-with-clara-lesson-1-fixed'],
            'runtime_profiles' => [],
        ],
    ],
    'portal_activity_map' => [
        'assessment-orientation' => 'assessment-part-one',
        'assessment-task-1a' => 'assessment-part-one',
        'assessment-task-2a' => 'assessment-part-one',
        'assessment-task-2b' => 'assessment-part-one',
        'assessment-part-1-results' => 'assessment-part-one',
        'assessment-story-selection' => 'assessment-part-two',
        'assessment-task-3a' => 'assessment-part-two',
        'assessment-task-3b' => 'assessment-part-two',
        'assessment-part-2-results' => 'assessment-part-two',
        'assessment-complete' => 'assessment-part-two',
        'lesson-1-mission-1' => 'lesson-1',
        'lesson-1-mission-2' => 'lesson-1',
        'lesson-1-mission-3' => 'lesson-1',
        'lesson-1-complete' => 'lesson-1',
        'lesson-2-mission-1' => 'lesson-2',
        'lesson-2-mission-2' => 'lesson-2',
        'lesson-2-complete' => 'lesson-2',
    ],
    'clara_lines' => [
        ...$learnWithClaraLessonOneGreetingLines,
        ...$learnWithClaraLessonOneChapterOneLines,
        'lesson-intro' => [
            'text' => 'Hi. I am happy you are here. Let us get ready to read together.',
            'reference' => 'introduce',
            'path' => 'lesson-intro/lesson-intro.wav',
        ],
        'lesson-1-mission-1' => [
            'text' => 'Look at the big letter and the small letter. Say their letter name.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-1/mission-1/lesson-1-mission-1.wav',
        ],
        'lesson-1-mission-2' => [
            'text' => 'Find the first letter in the word. Say its letter name.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-1/mission-2/lesson-1-mission-2.wav',
        ],
        'lesson-1-mission-3' => [
            'text' => 'Find the missing first letter. Say the letter that completes the word.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-1/mission-3/lesson-1-mission-3.wav',
        ],
        'lesson-1-complete' => [
            'text' => 'Lesson one is complete. You are a Letter Leader.',
            'reference' => 'result',
            'path' => 'lessons/lesson-1/completion/lesson-1-complete.wav',
        ],
        'lesson-2-mission-1' => [
            'text' => 'Read the word you see. Say the whole word.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-2/mission-1/lesson-2-mission-1.wav',
        ],
        'lesson-2-mission-2' => [
            'text' => 'Look at the sentence. Find the highlighted word, then say that word.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-2/mission-2/lesson-2-mission-2.wav',
        ],
        'lesson-2-complete' => [
            'text' => 'Lesson two is complete. You are a Word Wizard.',
            'reference' => 'result',
            'path' => 'lessons/lesson-2/completion/lesson-2-complete.wav',
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
            'text' => 'Part one is complete. You worked hard, and I am proud of you.',
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
            'text' => 'Assessment complete. Your first lesson is ready.',
            'reference' => 'result',
            'path' => 'completion/assessment-complete.wav',
        ],
        ...$lessonOneItemCueLines,
        ...$lessonOneSupportLines,
        ...$lessonTwoItemCueLines,
        ...$lessonTwoSupportLines,
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
