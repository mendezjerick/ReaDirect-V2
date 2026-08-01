<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'throw' => false,
        ],

        'tts_catalog' => [
            'driver' => 'local',
            'root' => storage_path('app/private/tts/catalog'),
            'throw' => false,
        ],

        'tts_catalog_staging' => [
            'driver' => 'local',
            'root' => storage_path('app/private/tts/staging'),
            'throw' => false,
        ],

        'tts_catalog_archive' => [
            'driver' => 'local',
            'root' => storage_path('app/private/tts/catalog-archive'),
            'throw' => false,
        ],
    ],
];
