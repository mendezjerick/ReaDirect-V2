<?php

declare(strict_types=1);

use App\Services\FilipinoTtsAudioReviewSource;
use App\Services\FilipinoTtsCatalogSource;
use Illuminate\Contracts\Console\Kernel;

require dirname(__DIR__).'/vendor/autoload.php';

$application = require dirname(__DIR__).'/bootstrap/app.php';
$application->make(Kernel::class)->bootstrap();

$sourceAudit = app(FilipinoTtsCatalogSource::class)->audit();
$audioReview = app(FilipinoTtsAudioReviewSource::class)->audit();
$audit = [
    ...$sourceAudit,
    'publication_ready' => $sourceAudit['publication_ready']
        && $audioReview['review_ready'],
    'audio_review' => $audioReview,
];
fwrite(
    STDOUT,
    json_encode($audit, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL,
);

if (in_array('--require-ready', $argv, true) && ! $audit['publication_ready']) {
    exit(1);
}
