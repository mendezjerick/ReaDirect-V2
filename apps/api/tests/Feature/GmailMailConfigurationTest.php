<?php

namespace Tests\Feature;

use App\Mail\GmailDeliveryTestMail;
use App\Support\GmailSmtpConfiguration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use LogicException;
use Tests\TestCase;

final class GmailMailConfigurationTest extends TestCase
{
    public function test_gmail_configuration_requires_starttls_and_an_app_password(): void
    {
        $this->configureGmail();

        app(GmailSmtpConfiguration::class)->assertConfigured();

        $this->addToAssertionCount(1);
    }

    public function test_gmail_configuration_rejects_non_gmail_hosts(): void
    {
        $this->configureGmail();
        config()->set('mail.mailers.smtp.host', 'smtp.example.com');

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('MAIL_HOST must be smtp.gmail.com for Gmail delivery.');

        app(GmailSmtpConfiguration::class)->assertConfigured();
    }

    public function test_gmail_configuration_rejects_app_passwords_with_spaces(): void
    {
        $this->configureGmail();
        config()->set('mail.gmail.app_password', 'abcd efgh ijkl mnop');
        config()->set('mail.mailers.smtp.password', 'abcd efgh ijkl mnop');

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('GMAIL_APP_PASSWORD must be a 16-character Google App Password without spaces.');

        app(GmailSmtpConfiguration::class)->assertConfigured();
    }

    public function test_delivery_diagnostic_sends_only_to_the_configured_account(): void
    {
        Mail::fake();
        $this->configureGmail();

        $this->assertSame(0, Artisan::call('readirect:mail-test'));
        $this->assertStringContainsString(
            'Gmail accepted the ReaDirect delivery test for re*******@example.com.',
            Artisan::output(),
        );

        Mail::assertSent(
            GmailDeliveryTestMail::class,
            fn (GmailDeliveryTestMail $mail): bool => $mail->hasTo('readirect@example.com'),
        );
    }

    private function configureGmail(): void
    {
        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp.scheme', 'smtp');
        config()->set('mail.mailers.smtp.host', 'smtp.gmail.com');
        config()->set('mail.mailers.smtp.port', 587);
        config()->set('mail.mailers.smtp.require_tls', true);
        config()->set('mail.mailers.smtp.username', 'readirect@example.com');
        config()->set('mail.mailers.smtp.password', 'abcdefghijklmnop');
        config()->set('mail.from.address', 'readirect@example.com');
        config()->set('mail.gmail.app_password', 'abcdefghijklmnop');
    }
}
