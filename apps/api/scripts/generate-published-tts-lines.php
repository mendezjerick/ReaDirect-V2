<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Http;
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

if (! is_string($migrationKey) || trim($migrationKey) === '') {
    fwrite(
        STDERR,
        "Usage: php scripts/generate-published-tts-lines.php --migration=<key>\n",
    );
    exit(1);
}

$migration = config("speech.pending_published_catalog_migrations.{$migrationKey}");
if (! is_array($migration)
    || ! is_array($migration['new_lines'] ?? null)
    || ! is_array($migration['replacement_lines'] ?? null)) {
    fwrite(STDERR, "Unknown staged published-speech migration: {$migrationKey}.\n");
    exit(1);
}

/** @var array<string, array{text: string, reference: string, path: string}> $definitions */
$definitions = [
    ...$migration['new_lines'],
    ...$migration['replacement_lines'],
];

if ($definitions === []) {
    fwrite(STDERR, "Staged published-speech migration {$migrationKey} has no lines.\n");
    exit(1);
}

$stagingDisk = Storage::disk('tts_catalog_staging');
$endpoint = rtrim((string) config('speech.tts_url'), '/').'/synthesize';
$generated = 0;
$skipped = 0;

foreach ($definitions as $speechKey => $definition) {
    if (! is_array($definition)
        || ! is_string($definition['text'] ?? null)
        || ! is_string($definition['reference'] ?? null)
        || ! is_string($definition['path'] ?? null)
        || str_contains($definition['text'], '!')) {
        throw new RuntimeException("Invalid staged speech definition: {$speechKey}");
    }

    $relativePath = "{$migrationKey}/sh/{$definition['path']}";
    if ($stagingDisk->exists($relativePath)) {
        $existing = $stagingDisk->get($relativePath);
        if (strlen($existing) < 12
            || substr($existing, 0, 4) !== 'RIFF'
            || substr($existing, 8, 4) !== 'WAVE') {
            throw new RuntimeException(
                "Refusing to overwrite invalid staged WAV: {$relativePath}",
            );
        }

        $skipped++;
        fwrite(STDOUT, "Already staged: {$speechKey}\n");
        continue;
    }

    $response = Http::accept('audio/wav')
        ->withToken((string) config('speech.tts_token'))
        ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
        ->timeout((int) config('speech.tts_request_timeout_seconds'))
        ->post($endpoint, [
            'text' => $definition['text'],
            'reference' => $definition['reference'],
        ]);

    if (! $response->successful()) {
        throw new RuntimeException(
            "Vox could not generate {$speechKey}: HTTP {$response->status()}",
        );
    }

    $audio = $response->body();
    if (strlen($audio) < 12
        || substr($audio, 0, 4) !== 'RIFF'
        || substr($audio, 8, 4) !== 'WAVE') {
        throw new RuntimeException("Vox returned invalid WAV audio for {$speechKey}.");
    }

    $stagingDisk->put($relativePath, $audio);
    $generated++;
    fwrite(STDOUT, "Staged: {$speechKey}\n");
}

fwrite(
    STDOUT,
    sprintf(
        "Completed staged migration %s: %d generated, %d already staged, %d total.\n",
        $migrationKey,
        $generated,
        $skipped,
        count($definitions),
    ),
);
