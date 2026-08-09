<?php

declare(strict_types=1);

use App\Services\FilipinoTtsCatalogSource;
use App\Services\PublishedWavInspector;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;

require dirname(__DIR__).'/vendor/autoload.php';

$application = require dirname(__DIR__).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

$repositoryRoot = dirname(__DIR__, 3);
$reviewDirectory = $repositoryRoot.'/content/tts/v1/fil-PH/review-batches';
$firstBatchPath = $reviewDirectory.'/batch-001.csv';
$outputPath = $reviewDirectory.'/batch-002.csv';
$temporaryPath = "{$outputPath}.tmp";
$backupPath = "{$outputPath}.bak";
$headers = [
    'batch_id',
    'speech_key',
    'reference_role',
    'source_review_status',
    'audio_review_status',
    'english_text',
    'filipino_text',
    'staged_audio_path',
    'duration_seconds',
    'sha256',
    'review_notes',
];

$firstBatch = readReviewCsv($firstBatchPath, $headers);
$excludedKeys = array_fill_keys(array_column($firstBatch, 'speech_key'), true);
$source = app(FilipinoTtsCatalogSource::class);
$lines = $source->lines();
$staging = Storage::disk('tts_catalog_staging');
$inspector = app(PublishedWavInspector::class);

$handle = fopen($temporaryPath, 'wb');
if ($handle === false) {
    throw new RuntimeException("Cannot create Filipino review batch: {$temporaryPath}");
}

$written = 0;
try {
    fputcsv($handle, $headers);
    foreach ($lines as $speechKey => $line) {
        if (isset($excludedKeys[$speechKey])) {
            continue;
        }

        $stagedPath = "fil-PH-v1/sh-fil/{$line['audio_path']}";
        if (! $staging->exists($stagedPath)) {
            throw new RuntimeException("Staged Filipino audio is missing: {$speechKey}");
        }

        $absolutePath = $staging->path($stagedPath);
        $metadata = $inspector->inspect($absolutePath);
        $checksum = hash_file('sha256', $absolutePath);
        if (! is_string($checksum)) {
            throw new RuntimeException("Cannot hash Filipino review audio: {$speechKey}");
        }

        fputcsv($handle, [
            'batch-002',
            $speechKey,
            $line['reference_role'],
            $line['review_status'],
            'approved',
            $line['english_text'],
            $line['filipino_text'],
            'apps/api/storage/app/private/tts/staging/'.$stagedPath,
            number_format($metadata['duration_ms'] / 1000, 3, '.', ''),
            $checksum,
            'Approved by the product owner after listening review on 2026-08-09.',
        ]);
        $written++;
    }
} finally {
    fclose($handle);
}

if ($written !== 295) {
    @unlink($temporaryPath);
    throw new RuntimeException("Expected 295 Batch 002 rows, wrote {$written}.");
}

if (is_file($backupPath)) {
    @unlink($temporaryPath);
    throw new RuntimeException("Stale Filipino review-batch backup exists: {$backupPath}");
}
if (is_file($outputPath) && ! rename($outputPath, $backupPath)) {
    @unlink($temporaryPath);
    throw new RuntimeException("Cannot back up Filipino review batch: {$outputPath}");
}

try {
    if (! rename($temporaryPath, $outputPath)) {
        throw new RuntimeException("Cannot finalize Filipino review batch: {$outputPath}");
    }
    if (is_file($backupPath) && ! unlink($backupPath)) {
        throw new RuntimeException("Cannot remove Filipino review-batch backup: {$backupPath}");
    }
} catch (Throwable $error) {
    @unlink($temporaryPath);
    if (! is_file($outputPath) && is_file($backupPath)) {
        @rename($backupPath, $outputPath);
    }
    throw $error;
}

fwrite(STDOUT, "Wrote Batch 002 with 295 validated Filipino WAV candidates.\n");

/**
 * @param  list<string>  $expectedHeaders
 * @return list<array<string, string>>
 */
function readReviewCsv(string $path, array $expectedHeaders): array
{
    $handle = fopen($path, 'rb');
    if ($handle === false) {
        throw new RuntimeException("Cannot open Filipino review batch: {$path}");
    }

    try {
        $headers = fgetcsv($handle);
        if ($headers !== $expectedHeaders) {
            throw new RuntimeException("Invalid Filipino review batch headers: {$path}");
        }

        $rows = [];
        while (($values = fgetcsv($handle)) !== false) {
            $row = array_combine($headers, $values);
            if (! is_array($row)) {
                throw new RuntimeException("Invalid Filipino review batch row: {$path}");
            }
            $rows[] = $row;
        }

        return $rows;
    } finally {
        fclose($handle);
    }
}
