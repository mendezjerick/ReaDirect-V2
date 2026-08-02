<?php

use App\Mail\GmailDeliveryTestMail;
use App\Support\GmailSmtpConfiguration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Console\Command\Command;

Artisan::command('readirect:status', function (): void {
    $this->info('ReaDirect API is ready.');
})->purpose('Confirm that the ReaDirect API console is available');

Artisan::command('readirect:mail-test', function (): int {
    $gmail = app(GmailSmtpConfiguration::class);

    try {
        $gmail->assertConfigured();
    } catch (Throwable $exception) {
        $this->error($exception->getMessage());

        return Command::FAILURE;
    }

    try {
        Mail::to($gmail->username())->send(new GmailDeliveryTestMail);
    } catch (Throwable) {
        $this->error('Gmail delivery failed. Verify the address, App Password, network access, and Google account policy.');

        return Command::FAILURE;
    }

    $this->info('Gmail accepted the ReaDirect delivery test for '.$gmail->maskedUsername().'.');

    return Command::SUCCESS;
})->purpose('Send a non-secret delivery test through the configured Gmail account');
