<?php

return [
    'schema_version' => 1,
    'minimum_app_version' => '1.0.0',
    'limits' => [
        'max_pack_bytes' => 50 * 1024 * 1024,
        'max_manifest_bytes' => 256 * 1024,
        'max_content_bytes' => 2 * 1024 * 1024,
        'max_single_asset_bytes' => 20 * 1024 * 1024,
        'max_item_count' => 500,
        'max_asset_count' => 200,
        'max_dialogue_count' => 500,
        'max_module_count' => 12,
        'max_dialogue_keys_per_item' => 8,
        'max_choice_count' => 6,
        'max_id_length' => 96,
        'max_title_length' => 160,
        'max_text_length' => 2000,
    ],
    'allowed_content_mime' => 'application/json',
    'allowed_audio_mimes' => ['audio/wav'],
];
