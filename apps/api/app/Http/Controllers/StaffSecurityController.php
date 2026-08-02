<?php

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffSession;
use App\Models\StaffUser;
use App\Models\StaffVerificationCode;
use App\Services\StaffVerificationCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class StaffSecurityController extends Controller
{
    public function requestEmailVerification(
        Request $request,
        StaffVerificationCodeService $codes,
    ): JsonResponse {
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email'))),
        ]);
        $input = $request->validate([
            'email' => [
                'required',
                'string',
                'email',
                'max:254',
                Rule::unique('staff_users', 'email')->ignore($request->user()->id),
            ],
            'current_password' => ['required', 'string', 'max:255'],
        ]);
        /** @var StaffUser $staffUser */
        $staffUser = $request->user();
        $this->assertCurrentPassword($staffUser, $input['current_password']);
        $this->assertEmailAvailable($staffUser, $input['email']);

        if ($staffUser->email_verified_at !== null
            && hash_equals((string) $staffUser->email, $input['email'])) {
            throw ValidationException::withMessages([
                'email' => ['This email address is already verified for the account.'],
            ]);
        }

        $codes->issue($staffUser, StaffVerificationCode::PURPOSE_EMAIL_BINDING, $input['email']);
        $this->audit($staffUser, 'staff.email_verification_requested', $request, [
            'email_hash' => hash('sha256', $input['email']),
        ]);

        return $this->sensitiveResponse([
            'verification_sent' => true,
            'expires_in_seconds' => $this->expirySeconds(),
        ]);
    }

    public function verifyEmail(
        Request $request,
        StaffVerificationCodeService $codes,
    ): JsonResponse {
        $input = $request->validate([
            'code' => ['required', 'string', 'digits:6'],
        ]);
        /** @var StaffUser $staffUser */
        $staffUser = $request->user();

        try {
            $record = $codes->consume(
                $staffUser,
                StaffVerificationCode::PURPOSE_EMAIL_BINDING,
                null,
                $input['code'],
            );
        } catch (ValidationException $exception) {
            $this->audit($staffUser, 'staff.email_verification_failed', $request);
            throw $exception;
        }
        DB::transaction(function () use ($staffUser, $record): void {
            $lockedUser = StaffUser::query()->lockForUpdate()->findOrFail($staffUser->id);
            $this->assertEmailAvailable($lockedUser, $record->destination_email, 'code');

            $lockedUser->forceFill([
                'email' => $record->destination_email,
                'email_verified_at' => now(),
            ])->save();
        });

        $staffUser->refresh();
        $this->audit($staffUser, 'staff.email_verified', $request, [
            'email_hash' => hash('sha256', $record->destination_email),
        ]);

        return $this->sensitiveResponse([
            'email' => $staffUser->email,
            'email_verified_at' => $staffUser->email_verified_at?->toIso8601String(),
        ]);
    }

    public function requestPasswordChangeCode(
        Request $request,
        StaffVerificationCodeService $codes,
    ): JsonResponse {
        $input = $request->validate([
            'current_password' => ['required', 'string', 'max:255'],
        ]);
        /** @var StaffUser $staffUser */
        $staffUser = $request->user();
        $this->assertCurrentPassword($staffUser, $input['current_password']);
        $this->assertVerifiedEmail($staffUser);

        $codes->issue(
            $staffUser,
            StaffVerificationCode::PURPOSE_PASSWORD_CHANGE,
            (string) $staffUser->email,
        );
        $this->audit($staffUser, 'staff.password_change_requested', $request);

        return $this->sensitiveResponse([
            'verification_sent' => true,
            'expires_in_seconds' => $this->expirySeconds(),
        ]);
    }

    public function updatePassword(
        Request $request,
        StaffVerificationCodeService $codes,
    ): JsonResponse {
        $input = $request->validate([
            'current_password' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed', 'different:current_password'],
        ]);
        /** @var StaffUser $staffUser */
        $staffUser = $request->user();
        /** @var StaffSession $currentSession */
        $currentSession = $request->attributes->get('staff_session');
        $this->assertCurrentPassword($staffUser, $input['current_password']);
        $this->assertVerifiedEmail($staffUser);
        try {
            $codes->consume(
                $staffUser,
                StaffVerificationCode::PURPOSE_PASSWORD_CHANGE,
                (string) $staffUser->email,
                $input['code'],
            );
        } catch (ValidationException $exception) {
            $this->audit($staffUser, 'staff.password_change_verification_failed', $request);
            throw $exception;
        }

        DB::transaction(function () use ($staffUser, $currentSession, $input, $request): void {
            $lockedUser = StaffUser::query()->lockForUpdate()->findOrFail($staffUser->id);
            $this->assertCurrentPassword($lockedUser, $input['current_password']);
            $this->assertVerifiedEmail($lockedUser);

            $lockedUser->forceFill([
                'password' => $input['password'],
                'requires_credential_setup' => false,
            ])->save();
            StaffSession::query()
                ->where('staff_user_id', $lockedUser->id)
                ->whereKeyNot($currentSession->id)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now()]);
            StaffVerificationCode::query()
                ->where('staff_user_id', $lockedUser->id)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            $this->audit($lockedUser, 'staff.password_changed', $request, [
                'other_sessions_revoked' => true,
            ]);
        });

        return $this->sensitiveResponse(['password_changed' => true]);
    }

    private function assertCurrentPassword(StaffUser $staffUser, string $password): void
    {
        if (! Hash::check($password, $staffUser->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }
    }

    private function assertVerifiedEmail(StaffUser $staffUser): void
    {
        if ($staffUser->email === null || $staffUser->email_verified_at === null) {
            throw new HttpException(
                409,
                'A verified email address is required before changing the password.',
            );
        }
    }

    private function assertEmailAvailable(
        StaffUser $staffUser,
        string $email,
        string $errorKey = 'email',
    ): void {
        $emailOwnerExists = StaffUser::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])
            ->whereKeyNot($staffUser->id)
            ->exists();
        if ($emailOwnerExists) {
            throw ValidationException::withMessages([
                $errorKey => [$errorKey === 'code'
                    ? 'The authentication code is invalid or has expired.'
                    : 'This email address is already assigned to a staff account.'],
            ]);
        }
    }

    private function audit(
        StaffUser $staffUser,
        string $action,
        Request $request,
        array $metadata = [],
    ): void {
        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => $action,
            'description' => match ($action) {
                'staff.email_verification_requested' => 'Requested verification for a staff email binding.',
                'staff.email_verified' => 'Verified and bound a staff email address.',
                'staff.email_verification_failed' => 'Submitted an invalid or expired staff email verification code.',
                'staff.password_change_requested' => 'Requested authorization for a staff password change.',
                'staff.password_change_verification_failed' => 'Submitted an invalid or expired password-change code.',
                'staff.password_changed' => 'Changed the staff account password.',
            },
            'metadata' => [
                'ip_address' => $request->ip(),
                ...$metadata,
            ],
        ]);
    }

    private function expirySeconds(): int
    {
        return (int) config('security.staff_auth.verification_code_expiry_minutes', 10) * 60;
    }

    private function sensitiveResponse(array $payload): JsonResponse
    {
        return response()->json($payload)->withHeaders([
            'Cache-Control' => 'no-store, private',
            'Pragma' => 'no-cache',
        ]);
    }
}
