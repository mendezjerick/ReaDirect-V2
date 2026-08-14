<?php

$flag = static function (string $name, bool $default): bool {
    $value = env($name);

    if ($value === null) {
        return $default;
    }

    return filter_var($value, FILTER_VALIDATE_BOOL);
};

$enabled = $flag('PILOT_MODE', false);

return [
    'enabled' => $enabled,
    'asr_available' => $flag('ASR_ENABLED', ! $enabled),
    'runtime_tts_available' => $flag('RUNTIME_TTS_ENABLED', ! $enabled),
    'realtime_available' => $flag('REALTIME_ENABLED', ! $enabled),
    'system_admin_username' => env('SYSTEM_ADMIN_USERNAME', env('DEV_SYSTEM_ADMIN_USERNAME')),
    'system_admin_password' => env('SYSTEM_ADMIN_PASSWORD', env('DEV_SYSTEM_ADMIN_PASSWORD')),
    'asr_unavailable_message' => 'ASR is unavailable during pilot testing.',
    'published_speech_excluded_keys' => $enabled ? [
        'learn-with-clara-words-rescue-opening',
        'learn-with-clara-words-find-bat',
        'learn-with-clara-words-find-can',
        'learn-with-clara-words-find-dot',
        'learn-with-clara-words-find-gap',
        'learn-with-clara-words-find-hot',
        'learn-with-clara-words-rescue-finale',
    ] : [],
];
