<?php

declare(strict_types=1);

$workspaceRoot = dirname(__DIR__, 3);
$cacheRoot = realpath($workspaceRoot.'/services/tts/storage/cache');
$expectedRoot = realpath($workspaceRoot).DIRECTORY_SEPARATOR
    .'services'.DIRECTORY_SEPARATOR.'tts'.DIRECTORY_SEPARATOR.'storage'.DIRECTORY_SEPARATOR.'cache';

if ($cacheRoot === false || $expectedRoot === false || $cacheRoot !== $expectedRoot) {
    throw new RuntimeException('Refusing to clear an unexpected TTS runtime-cache directory.');
}

if (! in_array('--confirm', $argv, true)) {
    fwrite(STDOUT, "Runtime cache verified at {$cacheRoot}. Re-run with --confirm to remove its files.\n");
    exit(0);
}

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($cacheRoot, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST,
);
$removed = 0;

foreach ($iterator as $entry) {
    if ($entry->isDir()) {
        if (! rmdir($entry->getPathname())) {
            throw new RuntimeException("Could not remove cache directory: {$entry->getPathname()}");
        }

        continue;
    }

    if (! unlink($entry->getPathname())) {
        throw new RuntimeException("Could not remove cache file: {$entry->getPathname()}");
    }

    $removed++;
}

fwrite(STDOUT, "Removed {$removed} TTS runtime-cache files. Reference-cache and published catalog were not touched.\n");
