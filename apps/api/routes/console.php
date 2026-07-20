<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('readirect:status', function (): void {
    $this->info('ReaDirect API is ready.');
})->purpose('Confirm that the ReaDirect API console is available');
