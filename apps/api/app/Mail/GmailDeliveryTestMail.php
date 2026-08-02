<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;

final class GmailDeliveryTestMail extends Mailable
{
    public function build(): self
    {
        return $this
            ->subject('ReaDirect Gmail delivery test')
            ->html(
                '<p>ReaDirect successfully connected to the configured Gmail SMTP account.</p>'
                .'<p>No authentication code or account credential is included in this test.</p>',
            );
    }
}
