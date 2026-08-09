<?php

declare(strict_types=1);

use App\Services\FilipinoTtsAudioReviewSource;
use App\Services\FilipinoTtsCatalogSource;
use App\Services\PublishedWavInspector;
use Database\Seeders\FilipinoTtsSpeechCatalogSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;

require dirname(__DIR__).'/vendor/autoload.php';

$application = require dirname(__DIR__).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

if (! in_array('--confirm', $argv, true)) {
    fwrite(
        STDERR,
        "Usage: php scripts/publish-filipino-tts-catalog.php --confirm\n",
    );
    exit(1);
}

$definitions = app(FilipinoTtsCatalogSource::class)
    ->publicationDefinitions();
$audioReviews = app(FilipinoTtsAudioReviewSource::class)->approvedRows();
if (count($definitions) !== 300) {
    throw new RuntimeException('Filipino publication requires exactly 300 approved lines.');
}

$staging = Storage::disk('tts_catalog_staging');
$catalog = Storage::disk('tts_catalog');
$inspector = app(PublishedWavInspector::class);
$stagedAudio = [];

foreach ($definitions as $speechKey => $definition) {
    $stagedPath = "fil-PH-v1/sh-fil/{$definition['path']}";
    $activePath = "sh-fil/{$definition['path']}";
    if (! $staging->exists($stagedPath)) {
        throw new RuntimeException("Staged Filipino audio is missing: {$speechKey}");
    }
    $stagedAbsolutePath = $staging->path($stagedPath);
    $metadata = $inspector->inspect($stagedAbsolutePath);
    $sourceChecksum = hash_file('sha256', $stagedAbsolutePath);
    $audioReview = $audioReviews[$speechKey] ?? null;
    if (! is_array($audioReview)
        || ! is_string($sourceChecksum)
        || ! hash_equals($audioReview['sha256'], $sourceChecksum)
        || $audioReview['duration_seconds'] !== number_format(
            $metadata['duration_ms'] / 1000,
            3,
            '.',
            '',
        )) {
        throw new RuntimeException(
            "Filipino audio review does not match staged audio: {$speechKey}",
        );
    }
    if ($catalog->exists($activePath)) {
        throw new RuntimeException(
            "Refusing to overwrite existing Filipino catalog audio: {$speechKey}",
        );
    }
    $stagedAudio[$activePath] = [
        'path' => $stagedPath,
        'sha256' => $sourceChecksum,
    ];
}

$publishedPaths = [];
try {
    foreach ($stagedAudio as $activePath => $stagedDefinition) {
        $stagedPath = $stagedDefinition['path'];
        $stagedAbsolutePath = $staging->path($stagedPath);
        $sourceChecksum = $stagedDefinition['sha256'];
        $sourceStream = fopen($stagedAbsolutePath, 'rb');
        if ($sourceStream === false) {
            throw new RuntimeException(
                "Cannot stream staged Filipino audio: {$stagedPath}",
            );
        }

        try {
            if (! $catalog->writeStream($activePath, $sourceStream)) {
                throw new RuntimeException(
                    "Cannot publish Filipino catalog audio: {$activePath}",
                );
            }
        } finally {
            fclose($sourceStream);
        }

        $publishedPaths[] = $activePath;
        $publishedChecksum = hash_file(
            'sha256',
            $catalog->path($activePath),
        );
        if (! is_string($publishedChecksum)
            || ! hash_equals($sourceChecksum, $publishedChecksum)) {
            throw new RuntimeException(
                "Filipino catalog checksum mismatch: {$activePath}",
            );
        }
    }

    app(FilipinoTtsSpeechCatalogSeeder::class)->run();
} catch (Throwable $error) {
    foreach ($publishedPaths as $publishedPath) {
        $catalog->delete($publishedPath);
    }
    throw $error;
}

fwrite(
    STDOUT,
    "Published the atomic Filipino TTS catalog: 300 WAVs and voice clara-sh-fil-v1.\n",
);
