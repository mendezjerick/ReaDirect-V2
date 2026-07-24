<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require dirname(__DIR__).'/vendor/autoload.php';

$application = require dirname(__DIR__).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

$prefix = $argv[1] ?? null;
$force = in_array('--force', $argv, true);

if (! is_string($prefix) || trim($prefix) === '' || str_starts_with($prefix, '--')) {
    fwrite(STDERR, "Usage: php scripts/generate-published-tts-lines.php <speech-key-prefix> [--force]\n");
    exit(1);
}

$definitions = collect(config('speech.clara_lines', []))
    ->filter(
        fn (mixed $definition, string $speechKey): bool => str_starts_with(
            $speechKey,
            $prefix,
        ),
    );

if ($definitions->isEmpty()) {
    fwrite(STDERR, "No configured speech keys begin with {$prefix}.\n");
    exit(1);
}

$disk = Storage::disk('tts_catalog');
$endpoint = rtrim((string) config('speech.tts_url'), '/').'/synthesize';
$completed = 0;

foreach ($definitions as $speechKey => $definition) {
    if (! is_array($definition)
        || ! is_string($definition['text'] ?? null)
        || ! is_string($definition['reference'] ?? null)
        || ! is_string($definition['path'] ?? null)) {
        throw new RuntimeException("Invalid speech definition: {$speechKey}");
    }
    if (str_contains($definition['text'], '!')) {
        throw new RuntimeException(
            "Published TTS text cannot contain exclamation marks: {$speechKey}",
        );
    }

    $relativePath = "sh/{$definition['path']}";
    if ($disk->exists($relativePath) && ! $force) {
        fwrite(STDERR, "Refusing to overwrite {$relativePath}; pass --force to regenerate it.\n");
        exit(1);
    }

    $response = Http::accept('audio/wav')
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

    $disk->put($relativePath, $audio);
    $completed++;
    fwrite(
        STDOUT,
        sprintf(
            "Generated %d/%d: %s\n",
            $completed,
            $definitions->count(),
            $speechKey,
        ),
    );
}
