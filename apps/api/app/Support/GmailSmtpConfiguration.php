<?php

namespace App\Support;

use LogicException;

final class GmailSmtpConfiguration
{
    public function assertConfigured(): void
    {
        if (config('mail.default') !== 'smtp') {
            throw new LogicException('MAIL_MAILER must be smtp for Gmail delivery.');
        }

        if (config('mail.mailers.smtp.scheme') !== 'smtp') {
            throw new LogicException('MAIL_SCHEME must be smtp for Gmail STARTTLS delivery.');
        }

        if (mb_strtolower(trim((string) config('mail.mailers.smtp.host'))) !== 'smtp.gmail.com') {
            throw new LogicException('MAIL_HOST must be smtp.gmail.com for Gmail delivery.');
        }

        if ((int) config('mail.mailers.smtp.port') !== 587) {
            throw new LogicException('MAIL_PORT must be 587 for Gmail STARTTLS delivery.');
        }

        if (config('mail.mailers.smtp.require_tls') !== true) {
            throw new LogicException('MAIL_REQUIRE_TLS must be true for Gmail delivery.');
        }

        $username = mb_strtolower(trim((string) config('mail.mailers.smtp.username')));
        if (filter_var($username, FILTER_VALIDATE_EMAIL) === false) {
            throw new LogicException('MAIL_USERNAME must be the complete Gmail or Google Workspace address.');
        }

        $appPassword = (string) config('mail.gmail.app_password');
        if (preg_match('/^[A-Za-z0-9]{16}$/', $appPassword) !== 1) {
            throw new LogicException('GMAIL_APP_PASSWORD must be a 16-character Google App Password without spaces.');
        }

        if (! hash_equals($appPassword, (string) config('mail.mailers.smtp.password'))) {
            throw new LogicException('The Gmail App Password must be the configured SMTP credential.');
        }

        $fromAddress = mb_strtolower(trim((string) config('mail.from.address')));
        if (! hash_equals($username, $fromAddress)) {
            throw new LogicException('MAIL_FROM_ADDRESS must match MAIL_USERNAME for Gmail delivery.');
        }
    }

    public function username(): string
    {
        return mb_strtolower(trim((string) config('mail.mailers.smtp.username')));
    }

    public function maskedUsername(): string
    {
        [$local, $domain] = array_pad(explode('@', $this->username(), 2), 2, '');
        $visible = mb_substr($local, 0, min(2, mb_strlen($local)));

        return $visible.str_repeat('*', max(3, mb_strlen($local) - mb_strlen($visible))).'@'.$domain;
    }
}
