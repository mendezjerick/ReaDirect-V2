<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;

final class StaffVerificationCodeMail extends Mailable
{
    public function __construct(
        public readonly string $verificationCode,
        public readonly string $purpose,
        public readonly int $expiresInMinutes,
    ) {}

    public function build(): self
    {
        $action = $this->purpose === 'email_binding'
            ? 'verify this email address'
            : 'authorize your password change';
        $code = e($this->verificationCode);

        return $this
            ->subject('Your ReaDirect authentication code')
            ->html(
                '<p>Use this authentication code to '.e($action).':</p>'
                .'<p style="font-size: 24px; font-weight: 700; letter-spacing: 4px">'.$code.'</p>'
                .'<p>This code expires in '.$this->expiresInMinutes.' minutes and can be used once.</p>'
                .'<p>If you did not request this code, do not share it and contact your administrator.</p>',
            );
    }
}
