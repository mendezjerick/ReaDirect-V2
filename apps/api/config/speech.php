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

$finalAssessmentPartTwoSpeechKeys = [
    ...array_values(array_filter(
        $assessmentPartTwoSpeechKeys,
        fn (string $speechKey): bool => $speechKey !== 'assessment-complete',
    )),
    'assessment-final-complete',
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

$lessonThreeSupportLines = [
    'lesson-3-technical-retry' => [
        'text' => 'I could not hear that clearly. Let us try the phrase once more.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-3/support/technical/lesson-3-technical-retry.wav',
    ],
    'lesson-3-clue-mission-1' => [
        'text' => 'Read one word at a time from left to right. Then say the whole phrase.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-3/support/clues/lesson-3-clue-mission-1.wav',
    ],
    'lesson-3-feedback-independent' => [
        'text' => 'That is correct. You read the phrase by yourself.',
        'reference' => 'result',
        'path' => 'lessons/lesson-3/support/feedback/lesson-3-feedback-independent.wav',
    ],
    'lesson-3-feedback-supported' => [
        'text' => 'That is correct. The clue helped you read the phrase.',
        'reference' => 'result',
        'path' => 'lessons/lesson-3/support/feedback/lesson-3-feedback-supported.wav',
    ],
    'lesson-3-feedback-demonstrated' => [
        'text' => 'That is correct. You read the whole phrase with me.',
        'reference' => 'result',
        'path' => 'lessons/lesson-3/support/feedback/lesson-3-feedback-demonstrated.wav',
    ],
    'lesson-3-feedback-not-yet' => [
        'text' => 'Not yet, and that is okay. We will practice this phrase again.',
        'reference' => 'result',
        'path' => 'lessons/lesson-3/support/feedback/lesson-3-feedback-not-yet.wav',
    ],
    'lesson-3-feedback-unscorable' => [
        'text' => 'I still could not hear a clear answer. We can try this phrase again later.',
        'reference' => 'result',
        'path' => 'lessons/lesson-3/support/feedback/lesson-3-feedback-unscorable.wav',
    ],
];

$lessonFourSupportLines = [
    'lesson-4-technical-retry' => [
        'text' => 'I could not hear that clearly. Let us try the sentence once more.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-4/support/technical/lesson-4-technical-retry.wav',
    ],
    'lesson-4-clue-mission-1' => [
        'text' => 'Read one word at a time from left to right. Then say the whole sentence.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-4/support/clues/lesson-4-clue-mission-1.wav',
    ],
    'lesson-4-feedback-independent' => [
        'text' => 'That is correct. You read the sentence by yourself.',
        'reference' => 'result',
        'path' => 'lessons/lesson-4/support/feedback/lesson-4-feedback-independent.wav',
    ],
    'lesson-4-feedback-supported' => [
        'text' => 'That is correct. The clue helped you read the sentence.',
        'reference' => 'result',
        'path' => 'lessons/lesson-4/support/feedback/lesson-4-feedback-supported.wav',
    ],
    'lesson-4-feedback-demonstrated' => [
        'text' => 'That is correct. You read the whole sentence with me.',
        'reference' => 'result',
        'path' => 'lessons/lesson-4/support/feedback/lesson-4-feedback-demonstrated.wav',
    ],
    'lesson-4-feedback-not-yet' => [
        'text' => 'Not yet, and that is okay. We will practice this sentence again.',
        'reference' => 'result',
        'path' => 'lessons/lesson-4/support/feedback/lesson-4-feedback-not-yet.wav',
    ],
    'lesson-4-feedback-unscorable' => [
        'text' => 'I still could not hear a clear answer. We can try this sentence again later.',
        'reference' => 'result',
        'path' => 'lessons/lesson-4/support/feedback/lesson-4-feedback-unscorable.wav',
    ],
];

$lessonFiveSupportLines = [
    'lesson-5-technical-retry' => [
        'text' => 'I could not hear the passage clearly. Let us try it once more.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-5/support/technical/lesson-5-technical-retry.wav',
    ],
    'lesson-5-performance-excellent' => [
        'text' => 'You read the passage very clearly. You kept the words together from beginning to end.',
        'reference' => 'result',
        'path' => 'lessons/lesson-5/review/lesson-5-performance-excellent.wav',
    ],
    'lesson-5-performance-strong' => [
        'text' => 'You did good work reading that passage. A few words need more practice.',
        'reference' => 'result',
        'path' => 'lessons/lesson-5/review/lesson-5-performance-strong.wav',
    ],
    'lesson-5-performance-growing' => [
        'text' => 'You stayed with the passage and kept reading. Let us practice the words that were difficult.',
        'reference' => 'result',
        'path' => 'lessons/lesson-5/review/lesson-5-performance-growing.wav',
    ],
    'lesson-5-performance-beginning' => [
        'text' => 'Thank you for finishing the passage. Reading a whole story takes courage, and we can practice it again.',
        'reference' => 'result',
        'path' => 'lessons/lesson-5/review/lesson-5-performance-beginning.wav',
    ],
    'lesson-5-performance-skipped' => [
        'text' => 'That is okay. We can return to this passage another time.',
        'reference' => 'result',
        'path' => 'lessons/lesson-5/review/lesson-5-performance-skipped.wav',
    ],
    'lesson-5-performance-unavailable' => [
        'text' => 'I could not hear enough of the passage to show a reading result. We can try it again another time.',
        'reference' => 'result',
        'path' => 'lessons/lesson-5/review/lesson-5-performance-unavailable.wav',
    ],
];

$lessonSixItems = [
    'who-lena' => [
        'question' => 'Who has a red bag?',
        'guided' => 'Look at the highlighted name. Who has a red bag?',
        'demo' => 'The sentence says Lena. Choose Lena.',
        'correct' => 'That is correct. Lena has the red bag.',
    ],
    'who-rosa' => [
        'question' => 'Who has a pet cat?',
        'guided' => 'Look at the highlighted name. Who has a pet cat?',
        'demo' => 'The sentence says Rosa. Choose Rosa.',
        'correct' => 'That is correct. Rosa has the pet cat.',
    ],
    'what-mia' => [
        'question' => 'What does Mia have?',
        'guided' => 'Look at the highlighted thing. What does Mia have?',
        'demo' => 'The sentence says a red pen. Choose A red pen.',
        'correct' => 'That is correct. Mia has a red pen.',
    ],
    'what-ben' => [
        'question' => 'What does Ben have?',
        'guided' => 'Look at the highlighted thing. What does Ben have?',
        'demo' => 'The sentence says a pet dog. Choose A pet dog.',
        'correct' => 'That is correct. Ben has a pet dog.',
    ],
    'where-cat' => [
        'question' => 'Where is the cat?',
        'guided' => 'Look at the highlighted place. Where is the cat?',
        'demo' => 'The sentence says on a bed. Choose On a bed.',
        'correct' => 'That is correct. The cat is on a bed.',
    ],
    'where-hen' => [
        'question' => 'Where is the hen?',
        'guided' => 'Look at the highlighted place. Where is the hen?',
        'demo' => 'The sentence says in a hut. Choose In a hut.',
        'correct' => 'That is correct. The hen is in a hut.',
    ],
    'when-lito' => [
        'question' => 'When can Lito run?',
        'guided' => 'Look at the highlighted time. When can Lito run?',
        'demo' => 'The sentence says at noon. Choose At noon.',
        'correct' => 'That is correct. Lito can run at noon.',
    ],
    'when-nena' => [
        'question' => 'When can Nena nap?',
        'guided' => 'Look at the highlighted time. When can Nena nap?',
        'demo' => 'The sentence says at ten. Choose At ten.',
        'correct' => 'That is correct. Nena can nap at ten.',
    ],
    'why-mila' => [
        'question' => 'Why is Mila wet?',
        'guided' => 'Look at the highlighted reason. Why is Mila wet?',
        'demo' => 'The sentence says rain made Mila wet. Choose Rain.',
        'correct' => 'That is correct. Rain made Mila wet.',
    ],
    'why-tino' => [
        'question' => 'Why is Tino sad?',
        'guided' => 'Look at the highlighted reason. Why is Tino sad?',
        'demo' => 'The sentence says a cut made Tino sad. Choose A cut.',
        'correct' => 'That is correct. A cut made Tino sad.',
    ],
];

$lessonSixLines = [
    'lesson-6-mission-1' => [
        'text' => 'Read the sentence, listen to my question, then choose the best answer.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-6/mission-1/lesson-6-mission-1.wav',
    ],
    'lesson-6-clue-who' => [
        'text' => 'Who asks for a person. Find the name of the person in the sentence.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-6/support/clues/lesson-6-clue-who.wav',
    ],
    'lesson-6-clue-what' => [
        'text' => 'What asks for a thing or an action. Find what the sentence tells us.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-6/support/clues/lesson-6-clue-what.wav',
    ],
    'lesson-6-clue-where' => [
        'text' => 'Where asks for a place. Find the place in the sentence.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-6/support/clues/lesson-6-clue-where.wav',
    ],
    'lesson-6-clue-when' => [
        'text' => 'When asks for a time. Find the time in the sentence.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-6/support/clues/lesson-6-clue-when.wav',
    ],
    'lesson-6-clue-why' => [
        'text' => 'Why asks for a reason. Find the words that tell why it happened.',
        'reference' => 'instruction',
        'path' => 'lessons/lesson-6/support/clues/lesson-6-clue-why.wav',
    ],
    'lesson-6-complete' => [
        'text' => 'You finished all six reading lessons. You are a Question Detective. Your Final Assessment is ready.',
        'reference' => 'result',
        'path' => 'lessons/lesson-6/completion/lesson-6-complete.wav',
    ],
];

foreach ($lessonSixItems as $slug => $lines) {
    foreach (['question', 'guided', 'demo', 'correct'] as $kind) {
        $speechKey = "lesson-6-{$kind}-{$slug}";
        $lessonSixLines[$speechKey] = [
            'text' => $lines[$kind],
            'reference' => $kind === 'question' ? 'question' : (
                $kind === 'correct' ? 'result' : 'instruction'
            ),
            'path' => "lessons/lesson-6/{$kind}/{$speechKey}.wav",
        ];
    }
}

$learnWithClaraLettersLines = [
    'learn-with-clara-letters-parade-opening' => [
        'text' => 'Oh no. A playful gust scattered the little letters before the parade. Will you help me bring each one back to its big-letter partner?',
        'reference' => 'instruction',
        'path' => 'learn-with-clara/letters/parade/opening.wav',
    ],
    'learn-with-clara-letters-find-a' => [
        'text' => 'Big A is waiting under the apple arch. Can you find little a?',
        'reference' => 'question',
        'path' => 'learn-with-clara/letters/parade/find-a.wav',
    ],
    'learn-with-clara-letters-find-b' => [
        'text' => 'Now the balloon float is bobbing away. Find little b so big B has a partner.',
        'reference' => 'question',
        'path' => 'learn-with-clara/letters/parade/find-b.wav',
    ],
    'learn-with-clara-letters-find-c' => [
        'text' => 'The curved banner is rolling across the road. Can you spot little c?',
        'reference' => 'question',
        'path' => 'learn-with-clara/letters/parade/find-c.wav',
    ],
    'learn-with-clara-letters-find-d' => [
        'text' => 'Listen to the drum cart bounce. Find little d beside big D.',
        'reference' => 'question',
        'path' => 'learn-with-clara/letters/parade/find-d.wav',
    ],
    'learn-with-clara-letters-find-e' => [
        'text' => 'One last parade wagon is coming. Find little e so every pair can march together.',
        'reference' => 'question',
        'path' => 'learn-with-clara/letters/parade/find-e.wav',
    ],
    'learn-with-clara-letters-parade-finale' => [
        'text' => 'We found every little letter. A, B, C, D, and E are together. The Letter Parade can begin.',
        'reference' => 'result',
        'path' => 'learn-with-clara/letters/parade/finale.wav',
    ],
];
$learnWithClaraLettersSpeechKeys = [
    ...array_keys($learnWithClaraLettersLines),
    ...array_map(
        fn (string $letter): string => "lesson-1-letter-demo-{$letter}",
        range('A', 'E'),
    ),
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

$lessonThreeItemCueLines = [];
foreach ($lessonOneItemOrdinals as $position => $ordinal) {
    $speechKey = "lesson-3-mission-1-item-{$position}";
    $lessonThreeItemCueLines[$speechKey] = [
        'text' => "Now, read the {$ordinal} phrase.",
        'reference' => 'instruction',
        'path' => "lessons/lesson-3/mission-1/{$speechKey}.wav",
    ];
}

$lessonThreeDemonstrationLines = [];
$lessonThreePhrases = [
    'big-bag' => 'big bag',
    'big-dog' => 'big dog',
    'fat-cat' => 'fat cat',
    'fat-pig' => 'fat pig',
    'hot-pan' => 'hot pan',
    'red-cap' => 'red cap',
    'red-cup' => 'red cup',
    'wet-dog' => 'wet dog',
    'tan-bag' => 'tan bag',
    'sad-man' => 'sad man',
    'fun-run' => 'fun run',
    'cat-on-a-mat' => 'cat on a mat',
    'dog-on-a-log' => 'dog on a log',
    'fan-on-a-mat' => 'fan on a mat',
    'ham-in-a-pan' => 'ham in a pan',
    'hat-on-a-peg' => 'hat on a peg',
    'hen-in-a-pen' => 'hen in a pen',
    'kid-in-bed' => 'kid in bed',
    'pig-in-mud' => 'pig in mud',
    'wet-rag' => 'wet rag',
];
foreach ($lessonThreePhrases as $phraseKey => $phrase) {
    $speechKey = "lesson-3-demo-{$phraseKey}";
    $lessonThreeDemonstrationLines[$speechKey] = [
        'text' => "Listen: {$phrase}. Now say the whole phrase.",
        'reference' => 'instruction',
        'path' => "lessons/lesson-3/support/demonstrations/{$speechKey}.wav",
    ];
}

$lessonFourItemCueLines = [];
foreach ($lessonOneItemOrdinals as $position => $ordinal) {
    $speechKey = "lesson-4-mission-1-item-{$position}";
    $lessonFourItemCueLines[$speechKey] = [
        'text' => "Now, read the {$ordinal} sentence.",
        'reference' => 'instruction',
        'path' => "lessons/lesson-4/mission-1/{$speechKey}.wav",
    ];
}

$lessonFourDemonstrationLines = [];
$lessonFourSentences = [
    'big-bag-bed' => 'A big bag is on a bed',
    'cat-mat' => 'A cat is on a mat',
    'dog-log' => 'A dog is on a log',
    'hen-pen' => 'A hen is in a pen',
    'hot-pan-mat' => 'A hot pan is on a mat',
    'kid-hop' => 'A kid can hop',
    'man-dig' => 'A man can dig',
    'pig-mud' => 'A pig is in mud',
    'red-cup-mat' => 'A red cup is on a mat',
    'wet-dog-mat' => 'A wet dog is on a mat',
    'ana-bag' => 'Ana has a bag',
    'ben-cap' => 'Ben has a cap',
    'lena-hop' => 'Lena can hop',
    'lito-run' => 'Lito can run',
    'mia-cat' => 'Mia has a cat',
    'mina-fan' => 'Mina has a fan',
    'nena-sit' => 'Nena can sit',
    'nico-dog' => 'Nico has a dog',
    'rosa-red-bag' => 'Rosa has a red bag',
    'tino-pet-pig' => 'Tino has a pet pig',
];
foreach ($lessonFourSentences as $sentenceKey => $sentence) {
    $speechKey = "lesson-4-demo-{$sentenceKey}";
    $lessonFourDemonstrationLines[$speechKey] = [
        'text' => "Listen: {$sentence}. Now say the whole sentence.",
        'reference' => 'instruction',
        'path' => "lessons/lesson-4/support/demonstrations/{$speechKey}.wav",
    ];
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
        'assessment-final-part-two-fixed' => $finalAssessmentPartTwoSpeechKeys,
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
        'lesson-3-fixed' => [
            'lesson-3-mission-1',
            'lesson-3-complete',
            ...array_keys($lessonThreeItemCueLines),
            ...array_keys($lessonThreeSupportLines),
            ...array_keys($lessonThreeDemonstrationLines),
        ],
        'lesson-4-fixed' => [
            'lesson-4-mission-1',
            'lesson-4-complete',
            ...array_keys($lessonFourItemCueLines),
            ...array_keys($lessonFourSupportLines),
            ...array_keys($lessonFourDemonstrationLines),
        ],
        'lesson-5-fixed' => [
            'lesson-5-mission-1',
            'lesson-5-complete',
            ...array_keys($lessonFiveSupportLines),
        ],
        'lesson-6-fixed' => array_keys($lessonSixLines),
        'learn-with-clara-letters-fixed' => $learnWithClaraLettersSpeechKeys,
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
        'assessment-final-part-two' => [
            'published_groups' => ['assessment-final-part-two-fixed'],
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
        'lesson-3' => [
            'published_groups' => ['lesson-3-fixed'],
            'runtime_profiles' => ['result'],
        ],
        'lesson-4' => [
            'published_groups' => ['lesson-4-fixed'],
            'runtime_profiles' => ['result'],
        ],
        'lesson-5' => [
            'published_groups' => ['lesson-5-fixed'],
            'runtime_profiles' => [],
        ],
        'lesson-6' => [
            'published_groups' => ['lesson-6-fixed'],
            'runtime_profiles' => [],
        ],
        'learn-with-clara-letters' => [
            'published_groups' => ['learn-with-clara-letters-fixed'],
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
        'final-assessment-orientation' => 'assessment-part-one',
        'final-assessment-task-1a' => 'assessment-part-one',
        'final-assessment-task-2a' => 'assessment-part-one',
        'final-assessment-task-2b' => 'assessment-part-one',
        'final-assessment-part-1-results' => 'assessment-part-one',
        'final-assessment-story-selection' => 'assessment-final-part-two',
        'final-assessment-task-3a' => 'assessment-final-part-two',
        'final-assessment-task-3b' => 'assessment-final-part-two',
        'final-assessment-part-2-results' => 'assessment-final-part-two',
        'final-assessment-complete' => 'assessment-final-part-two',
        'lesson-1-mission-1' => 'lesson-1',
        'lesson-1-mission-2' => 'lesson-1',
        'lesson-1-mission-3' => 'lesson-1',
        'lesson-1-complete' => 'lesson-1',
        'lesson-2-mission-1' => 'lesson-2',
        'lesson-2-mission-2' => 'lesson-2',
        'lesson-2-complete' => 'lesson-2',
        'lesson-3-mission-1' => 'lesson-3',
        'lesson-3-complete' => 'lesson-3',
        'lesson-4-mission-1' => 'lesson-4',
        'lesson-4-complete' => 'lesson-4',
        'lesson-5-mission-1' => 'lesson-5',
        'lesson-5-review' => 'lesson-5',
        'lesson-5-complete' => 'lesson-5',
        'lesson-6-mission-1' => 'lesson-6',
        'lesson-6-targeted-clue' => 'lesson-6',
        'lesson-6-guided' => 'lesson-6',
        'lesson-6-demonstration' => 'lesson-6',
        'lesson-6-complete' => 'lesson-6',
    ],
    'clara_lines' => [
        ...$lessonSixLines,
        ...$learnWithClaraLettersLines,
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
        'lesson-3-mission-1' => [
            'text' => 'Read the phrase you see. Say all the words together.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-3/mission-1/lesson-3-mission-1.wav',
        ],
        'lesson-3-complete' => [
            'text' => 'Lesson three is complete. You are a Phrase Pro.',
            'reference' => 'result',
            'path' => 'lessons/lesson-3/completion/lesson-3-complete.wav',
        ],
        'lesson-4-mission-1' => [
            'text' => 'Read the sentence you see. Say all the words from beginning to end.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-4/mission-1/lesson-4-mission-1.wav',
        ],
        'lesson-4-complete' => [
            'text' => 'Lesson four is complete. You are a Sentence Star.',
            'reference' => 'result',
            'path' => 'lessons/lesson-4/completion/lesson-4-complete.wav',
        ],
        'lesson-5-mission-1' => [
            'text' => 'Read the passage from beginning to end. Take your time and say every word.',
            'reference' => 'instruction',
            'path' => 'lessons/lesson-5/mission-1/lesson-5-mission-1.wav',
        ],
        'lesson-5-complete' => [
            'text' => 'Lesson five is complete. You are a Passage Explorer.',
            'reference' => 'result',
            'path' => 'lessons/lesson-5/completion/lesson-5-complete.wav',
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
        'assessment-final-complete' => [
            'text' => 'You finished your Reading Journey. I am proud of how much you learned.',
            'reference' => 'result',
            'path' => 'completion/assessment-final-complete.wav',
        ],
        ...$lessonOneItemCueLines,
        ...$lessonOneSupportLines,
        ...$lessonTwoItemCueLines,
        ...$lessonTwoSupportLines,
        ...$lessonThreeItemCueLines,
        ...$lessonThreeSupportLines,
        ...$lessonThreeDemonstrationLines,
        ...$lessonFourItemCueLines,
        ...$lessonFourSupportLines,
        ...$lessonFourDemonstrationLines,
        ...$lessonFiveSupportLines,
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
