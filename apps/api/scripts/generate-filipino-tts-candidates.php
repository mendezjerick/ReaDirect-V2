<?php

declare(strict_types=1);

use App\Services\FilipinoTtsCatalogSource;
use App\Services\PublishedWavInspector;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require dirname(__DIR__).'/vendor/autoload.php';

$application = require dirname(__DIR__).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

$option = static function (string $name) use ($argv): ?string {
    $prefix = "--{$name}=";
    foreach ($argv as $argument) {
        if (str_starts_with($argument, $prefix)) {
            return substr($argument, strlen($prefix));
        }
    }

    return null;
};

$rolesOption = $option('roles');
$roles = is_string($rolesOption)
    ? array_values(array_filter(array_map('trim', explode(',', $rolesOption))))
    : [];
$limitOption = $option('limit');
$limit = is_string($limitOption) && ctype_digit($limitOption)
    ? (int) $limitOption
    : null;
$includeDrafts = in_array('--include-drafts', $argv, true);
$allowCandidateReference = in_array(
    '--allow-candidate-reference',
    $argv,
    true,
);
$confirmed = in_array('--confirm', $argv, true);

if ($roles === [] || ($limit !== null && $limit < 1)) {
    fwrite(
        STDERR,
        "Usage: php scripts/generate-filipino-tts-candidates.php --roles=<role[,role]> [--limit=<positive>] [--include-drafts] [--allow-candidate-reference] [--confirm]\n",
    );
    exit(1);
}

$source = app(FilipinoTtsCatalogSource::class);
$definitions = $source->candidateDefinitions(
    $roles,
    $includeDrafts,
    $allowCandidateReference,
);
if ($limit !== null) {
    $definitions = array_slice($definitions, 0, $limit, true);
}
if ($definitions === []) {
    throw new RuntimeException('No Filipino TTS lines match the requested candidate scope.');
}

fwrite(STDOUT, sprintf(
    "Candidate scope contains %d lines for roles: %s.\n",
    count($definitions),
    implode(', ', $roles),
));
if (! $confirmed) {
    fwrite(STDOUT, "Dry run only. Add --confirm to call Vox and write staging WAVs.\n");
    exit(0);
}

$staging = Storage::disk('tts_catalog_staging');
$inspector = app(PublishedWavInspector::class);
$endpoint = rtrim((string) config('speech.tts_url'), '/').'/synthesize';
$generated = 0;
$skipped = 0;

foreach ($definitions as $speechKey => $definition) {
    $stagedPath = "fil-PH-v1/sh-fil/{$definition['path']}";
    if ($staging->exists($stagedPath)) {
        $inspector->inspect($staging->path($stagedPath));
        $skipped++;
        fwrite(STDOUT, "Already staged: {$speechKey}\n");

        continue;
    }

    $temporaryStagedPath = "{$stagedPath}.part";
    $staging->makeDirectory(dirname($stagedPath));
    $staging->delete($temporaryStagedPath);
    $response = Http::accept('audio/wav')
        ->withToken((string) config('speech.tts_token'))
        ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
        ->timeout((int) config('speech.tts_request_timeout_seconds'))
        ->withOptions(['sink' => $staging->path($temporaryStagedPath)])
        ->post($endpoint, [
            'text' => $definition['text'],
            'reference' => $definition['reference'],
            'language' => 'fil-PH',
        ]);

    if (! $response->successful()
        || $response->header('X-ReaDirect-TTS-Language') !== 'fil-PH') {
        $staging->delete($temporaryStagedPath);
        throw new RuntimeException(
            "Vox could not generate Filipino {$speechKey}: HTTP {$response->status()}",
        );
    }

    try {
        $inspector->inspect($staging->path($temporaryStagedPath));
        if (! rename(
            $staging->path($temporaryStagedPath),
            $staging->path($stagedPath),
        )) {
            throw new RuntimeException(
                "Could not finalize Filipino {$speechKey} staging WAV.",
            );
        }
    } catch (Throwable $error) {
        $staging->delete($temporaryStagedPath);
        throw $error;
    }

    $generated++;
    fwrite(STDOUT, "Staged candidate: {$speechKey}\n");
    unset($response);
}

fwrite(STDOUT, sprintf(
    "Completed Filipino candidate batch: %d generated, %d already staged, %d total. Nothing was published.\n",
    $generated,
    $skipped,
    count($definitions),
));
