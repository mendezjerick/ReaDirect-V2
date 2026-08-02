<?php

namespace App\Services;

use App\Mail\StaffVerificationCodeMail;
use App\Models\StaffUser;
use App\Models\StaffVerificationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

final class StaffVerificationCodeService
{
    public function issue(StaffUser $staffUser, string $purpose, string $email): void
    {
        $email = mb_strtolower(trim($email));
        $now = now();
        $resendSeconds = (int) config('security.staff_auth.verification_code_resend_seconds', 60);
        $latest = StaffVerificationCode::query()
            ->where('staff_user_id', $staffUser->id)
            ->where('purpose', $purpose)
            ->latest('id')
            ->first();

        if ($latest !== null && $latest->created_at->gt($now->copy()->subSeconds($resendSeconds))) {
            $retryAfter = max(1, $resendSeconds - $latest->created_at->diffInSeconds($now));
            throw new HttpException(
                429,
                'Please wait before requesting another authentication code.',
                null,
                ['Retry-After' => (string) $retryAfter],
            );
        }

        $plainCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresInMinutes = (int) config('security.staff_auth.verification_code_expiry_minutes', 10);
        $record = DB::transaction(function () use (
            $staffUser,
            $purpose,
            $email,
            $plainCode,
            $expiresInMinutes,
            $now,
        ): StaffVerificationCode {
            StaffVerificationCode::query()
                ->where('staff_user_id', $staffUser->id)
                ->where('purpose', $purpose)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => $now]);

            return StaffVerificationCode::query()->create([
                'staff_user_id' => $staffUser->id,
                'purpose' => $purpose,
                'destination_email' => $email,
                'code_hash' => $this->hashCode($staffUser->id, $purpose, $email, $plainCode),
                'attempt_count' => 0,
                'expires_at' => $now->copy()->addMinutes($expiresInMinutes),
            ]);
        });

        try {
            Mail::to($email)->send(new StaffVerificationCodeMail(
                $plainCode,
                $purpose,
                $expiresInMinutes,
            ));
        } catch (Throwable $exception) {
            $record->delete();
            throw $exception;
        }
    }

    public function consume(
        StaffUser $staffUser,
        string $purpose,
        ?string $email,
        string $plainCode,
    ): StaffVerificationCode {
        [$valid, $record] = DB::transaction(function () use (
            $staffUser,
            $purpose,
            $email,
            $plainCode,
        ): array {
            $record = StaffVerificationCode::query()
                ->where('staff_user_id', $staffUser->id)
                ->where('purpose', $purpose)
                ->whereNull('consumed_at')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if ($record === null) {
                return [false, null];
            }

            $attemptCount = $record->attempt_count + 1;
            $notExpired = $record->expires_at->isFuture();
            $emailMatches = $email === null
                || hash_equals($record->destination_email, mb_strtolower(trim($email)));
            $codeMatches = hash_equals(
                $record->code_hash,
                $this->hashCode(
                    $staffUser->id,
                    $purpose,
                    $record->destination_email,
                    $plainCode,
                ),
            );
            $valid = $notExpired && $emailMatches && $codeMatches;
            $maximumAttempts = (int) config('security.staff_auth.verification_code_max_attempts', 5);

            $record->forceFill([
                'attempt_count' => $attemptCount,
                'consumed_at' => $valid || ! $notExpired || $attemptCount >= $maximumAttempts
                    ? now()
                    : null,
            ])->save();

            return [$valid, $record];
        });

        if (! $valid || ! $record instanceof StaffVerificationCode) {
            throw ValidationException::withMessages([
                'code' => ['The authentication code is invalid or has expired.'],
            ]);
        }

        return $record;
    }

    private function hashCode(
        int $staffUserId,
        string $purpose,
        string $email,
        string $plainCode,
    ): string {
        return hash_hmac(
            'sha256',
            implode('|', [$staffUserId, $purpose, mb_strtolower(trim($email)), $plainCode]),
            (string) config('app.key'),
        );
    }
}
