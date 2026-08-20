<?php

declare(strict_types=1);

use Database\Seeders\TtsSpeechCatalogSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;

require dirname(__DIR__).'/vendor/autoload.php';

$application = require dirname(__DIR__).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

$migrationOption = array_values(array_filter(
    $argv,
    fn (string $argument): bool => str_starts_with($argument, '--migration='),
));
$migrationKey = isset($migrationOption[0])
    ? substr($migrationOption[0], strlen('--migration='))
    : null;

if (! in_array('--confirm', $argv, true)
    || ! is_string($migrationKey)
    || trim($migrationKey) === '') {
    fwrite(
        STDERR,
        "Usage: php scripts/publish-staged-tts-catalog.php --migration=<key> --confirm\n",
    );
    exit(1);
}

$migration = config("speech.pending_published_catalog_migrations.{$migrationKey}");
if (! is_array($migration)
    || ! is_array($migration['new_lines'] ?? null)
    || ! is_array($migration['replacement_lines'] ?? null)) {
    throw new RuntimeException("Unknown staged published-speech migration: {$migrationKey}");
}

/** @var array<string, array{text: string, reference: string, path: string}> $newLines */
$newLines = $migration['new_lines'];
/** @var array<string, array{text: string, reference: string, path: string}> $replacementLines */
$replacementLines = $migration['replacement_lines'];
$targetLines = [...$newLines, ...$replacementLines];

if ($newLines === [] && $replacementLines === []) {
    throw new RuntimeException('The staged publication has no target lines.');
}

$expectedCatalogCount = $migration['expected_catalog_count'] ?? null;
if (! is_int($expectedCatalogCount) || $expectedCatalogCount < 1) {
    throw new RuntimeException('The staged publication must declare expected_catalog_count.');
}

foreach ($targetLines as $speechKey => $definition) {
    $activeDefinition = config("speech.clara_lines.{$speechKey}");
    if ($activeDefinition !== $definition) {
        throw new RuntimeException(
            "Active speech configuration does not match staged {$speechKey}.",
        );
    }
}

$seeder = new TtsSpeechCatalogSeeder();
$definitionsMethod = new ReflectionMethod($seeder, 'speechDefinitions');
/** @var array<string, array{text: string, reference: string, path: string}> $activeDefinitions */
$activeDefinitions = $definitionsMethod->invoke($seeder);
if (count($activeDefinitions) !== $expectedCatalogCount) {
    throw new RuntimeException(sprintf(
        'Expected %d active published lines, resolved %d.',
        $expectedCatalogCount,
        count($activeDefinitions),
    ));
}

$staging = Storage::disk('tts_catalog_staging');
$catalog = Storage::disk('tts_catalog');
$archive = Storage::disk('tts_catalog_archive');

$isApprovedWav = static function (string $audio): bool {
    if (strlen($audio) < 44
        || substr($audio, 0, 4) !== 'RIFF'
        || substr($audio, 8, 4) !== 'WAVE') {
        return false;
    }

    return unpack('v', substr($audio, 22, 2))[1] === 1
        && unpack('V', substr($audio, 24, 4))[1] === 48000
        && unpack('v', substr($audio, 34, 2))[1] === 16;
};

$stagedAudio = [];
foreach ($targetLines as $speechKey => $definition) {
    $stagedPath = "{$migrationKey}/sh/{$definition['path']}";
    if (! $staging->exists($stagedPath)) {
        throw new RuntimeException("Staged audio is missing for {$speechKey}.");
    }

    $audio = $staging->get($stagedPath);
    if (! $isApprovedWav($audio)) {
        throw new RuntimeException("Staged audio is not an approved WAV for {$speechKey}.");
    }

    $stagedAudio[$speechKey] = $audio;
}

foreach ($newLines as $speechKey => $definition) {
    $activePath = "sh/{$definition['path']}";
    if ($catalog->exists($activePath)) {
        throw new RuntimeException(
            "Refusing to overwrite an existing published WAV for new key {$speechKey}.",
        );
    }
}

$replacedOriginalAudio = [];
foreach ($replacementLines as $speechKey => $definition) {
    $activePath = "sh/{$definition['path']}";
    $archivePath = "{$migrationKey}/replacements/{$definition['path']}";
    if (! $catalog->exists($activePath)) {
        throw new RuntimeException("Existing published WAV is missing for replacement {$speechKey}.");
    }
    if ($archive->exists($archivePath)) {
        throw new RuntimeException("Replacement archive already exists for {$speechKey}.");
    }

    $replacedOriginalAudio[$activePath] = $catalog->get($activePath);
}

try {
    foreach ($replacementLines as $speechKey => $definition) {
        $activePath = "sh/{$definition['path']}";
        $archivePath = "{$migrationKey}/replacements/{$definition['path']}";
        $archive->put($archivePath, $replacedOriginalAudio[$activePath]);
    }

    foreach ($targetLines as $speechKey => $definition) {
        $activePath = "sh/{$definition['path']}";
        $catalog->put($activePath, $stagedAudio[$speechKey]);
        if (hash('sha256', $catalog->get($activePath))
            !== hash('sha256', $stagedAudio[$speechKey])) {
            throw new RuntimeException("Published checksum mismatch for {$speechKey}.");
        }
    }

    $seeder->run();
} catch (Throwable $exception) {
    foreach ($newLines as $definition) {
        $catalog->delete("sh/{$definition['path']}");
    }
    foreach ($replacedOriginalAudio as $activePath => $audio) {
        $catalog->put($activePath, $audio);
    }

    throw $exception;
}

fwrite(
    STDOUT,
    sprintf(
        "Published %d new lines and %d archive-backed replacements for %s. Active catalog target: %d lines.\n",
        count($newLines),
        count($replacementLines),
        $migrationKey,
        $expectedCatalogCount,
    ),
);
