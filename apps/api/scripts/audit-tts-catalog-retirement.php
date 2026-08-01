<?php

declare(strict_types=1);

use Database\Seeders\TtsSpeechCatalogSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;

require dirname(__DIR__).'/vendor/autoload.php';

$application = require dirname(__DIR__).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

$expectedOrphans = [
    'sh/learn-with-clara/lesson-1/chapter-1/completion/chapter-1-complete.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/items/pair-a.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/items/pair-b.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/items/pair-c.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/items/pair-d.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/items/pair-e.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/story/name-close.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/story/name-detail.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/story/name-opening.wav',
    'sh/learn-with-clara/lesson-1/chapter-1/story/name-return.wav',
    'sh/learn-with-clara/lesson-1/greetings/afternoon.wav',
    'sh/learn-with-clara/lesson-1/greetings/evening.wav',
    'sh/learn-with-clara/lesson-1/greetings/morning.wav',
    'sh/unresolved/5080a21209d15dac3b565f18d1a9478d9dd973b9c04e5dfb94b225dcdea6032d.wav',
];
sort($expectedOrphans);

$seeder = new TtsSpeechCatalogSeeder();
$definitionsMethod = new ReflectionMethod($seeder, 'speechDefinitions');
/** @var array<string, array{path: string}> $definitions */
$definitions = $definitionsMethod->invoke($seeder);
$configuredPaths = array_map(
    static fn (array $definition): string => 'sh/'.$definition['path'],
    $definitions,
);
sort($configuredPaths);

$catalog = Storage::disk('tts_catalog');
$physicalPaths = array_values(array_filter(
    $catalog->allFiles(),
    static fn (string $path): bool => str_ends_with($path, '.wav'),
));
sort($physicalPaths);
$orphanPaths = array_values(array_diff($physicalPaths, $configuredPaths));
$missingConfiguredPaths = array_values(array_diff($configuredPaths, $physicalPaths));
$unexpectedOrphans = array_values(array_diff($orphanPaths, $expectedOrphans));
$missingExpectedOrphans = array_values(array_diff($expectedOrphans, $orphanPaths));
$approvedCandidateSet = $missingConfiguredPaths === []
    && $unexpectedOrphans === []
    && $missingExpectedOrphans === [];
$completedRetirement = $missingConfiguredPaths === []
    && $orphanPaths === []
    && $missingExpectedOrphans === $expectedOrphans;

$report = [
    'retirement_state' => $approvedCandidateSet
        ? 'ready_for_confirmed_removal'
        : ($completedRetirement ? 'complete' : 'requires_review'),
    'configured_wavs' => count($configuredPaths),
    'physical_wavs' => count($physicalPaths),
    'orphan_wavs' => $orphanPaths,
    'missing_configured_wavs' => $missingConfiguredPaths,
    'unexpected_orphan_wavs' => $unexpectedOrphans,
    'missing_expected_orphan_wavs' => $missingExpectedOrphans,
];

fwrite(STDOUT, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL);

if (! in_array('--confirm', $argv, true)) {
    exit(0);
}

if (! $approvedCandidateSet) {
    fwrite(STDERR, "Refusing retirement: the catalog audit differs from the approved 14-path list.\n");
    exit(1);
}

foreach ($expectedOrphans as $path) {
    if (! $catalog->delete($path)) {
        throw new RuntimeException("Could not remove reviewed orphan: {$path}");
    }
}

fwrite(STDOUT, "Removed 14 reviewed orphan WAVs. Active configured catalog remains at 300 files.\n");
