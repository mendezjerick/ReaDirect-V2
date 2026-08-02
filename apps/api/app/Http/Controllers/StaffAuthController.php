<?php

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffSession;
use App\Models\StaffUser;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class StaffAuthController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'remember_me' => ['sometimes', 'boolean'],
            'device_id' => ['nullable', 'required_if:remember_me,true', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);

        $staffUser = StaffUser::query()
            ->where(function ($query) use ($credentials): void {
                $normalizedIdentifier = mb_strtolower(trim($credentials['identifier']));

                $query
                    ->whereRaw('LOWER(username) = ?', [$normalizedIdentifier])
                    ->orWhereRaw('LOWER(email) = ?', [$normalizedIdentifier]);
            })
            ->first();

        if (! $staffUser || ! $staffUser->is_active || ! Hash::check($credentials['password'], $staffUser->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided staff credentials are incorrect.'],
            ]);
        }

        $plainToken = Str::random(64);
        $remembered = ($credentials['remember_me'] ?? false) === true;
        $deviceHash = $remembered
            ? hash_hmac('sha256', $credentials['device_id'], (string) config('app.key'))
            : null;
        $session = DB::transaction(function () use ($staffUser, $plainToken, $request, $remembered, $deviceHash): ?StaffSession {
            $now = now();
            $leaseCutoff = $now->copy()->subSeconds((int) config(
                'staff.non_remembered_session_lease_seconds',
                120,
            ));

            if ($staffUser->role === 'system_admin') {
                $systemAdministrators = StaffUser::query()
                    ->where('role', 'system_admin')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();
                $staffUser = $systemAdministrators->firstWhere('id', $staffUser->id);
                if (! $staffUser instanceof StaffUser || ! $staffUser->is_active) {
                    return null;
                }

                $systemAdministratorIds = $systemAdministrators->pluck('id');
                $this->deleteInactiveSessions(
                    StaffSession::query()
                        ->whereIn('staff_user_id', $systemAdministratorIds),
                    $now,
                    $leaseCutoff,
                );

                $activeSession = StaffSession::query()
                    ->whereIn('staff_user_id', $systemAdministratorIds)
                    ->whereNull('revoked_at')
                    ->where('expires_at', '>', $now)
                    ->where(function ($query) use ($leaseCutoff): void {
                        $query
                            ->where('remembered', true)
                            ->orWhere(function ($query) use ($leaseCutoff): void {
                                $query
                                    ->where('remembered', false)
                                    ->whereNotNull('last_used_at')
                                    ->where('last_used_at', '>', $leaseCutoff);
                            });
                    })
                    ->first();
                if ($activeSession !== null) {
                    StaffAuditLog::query()->create([
                        'staff_user_id' => $staffUser->id,
                        'action_key' => 'staff.login_blocked_exclusive_session',
                        'description' => 'A system administrator login was blocked because another session is active.',
                        'metadata' => [
                            'ip_address' => $request->ip(),
                            'active_session_id' => $activeSession->id,
                        ],
                    ]);

                    return null;
                }
            } else {
                $staffUser = StaffUser::query()->lockForUpdate()->findOrFail($staffUser->id);
                $this->deleteInactiveSessions(
                    StaffSession::query()->where('staff_user_id', $staffUser->id),
                    $now,
                    $leaseCutoff,
                );
            }

            $session = StaffSession::query()->create([
                'staff_user_id' => $staffUser->id,
                'token_hash' => hash('sha256', $plainToken),
                'remembered' => $remembered,
                'device_hash' => $deviceHash,
                'last_used_at' => $now,
                'expires_at' => $remembered
                    ? $now->copy()->addDays((int) config('staff.remembered_session_lifetime_days', 30))
                    : $now->copy()->addHours(max(1, (int) config('staff.session_lifetime_hours', 8))),
            ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'staff.login',
                'description' => 'Signed in to the staff workspace.',
                'metadata' => [
                    'ip_address' => $request->ip(),
                ],
            ]);

            return $session;
        });

        if ($session === null) {
            return response()->json([
                'message' => 'A system administrator session is already active.',
                'code' => 'system_admin_session_active',
            ], 409)->withHeaders([
                'Cache-Control' => 'no-store, private',
                'Pragma' => 'no-cache',
            ]);
        }

        $staffUser = $session->staffUser;

        return response()->json([
            'token' => $plainToken,
            ...$this->serializeSession($session, $staffUser),
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        /** @var StaffSession $session */
        $session = $request->attributes->get('staff_session');

        return response()->json($this->serializeSession($session, $session->staffUser));
    }

    public function destroy(Request $request): JsonResponse
    {
        /** @var StaffSession $session */
        $session = $request->attributes->get('staff_session');
        $session->forceFill(['revoked_at' => now()])->save();

        StaffAuditLog::query()->create([
            'staff_user_id' => $session->staff_user_id,
            'action_key' => 'staff.logout',
            'description' => 'Signed out of the staff workspace.',
            'metadata' => [
                'ip_address' => $request->ip(),
            ],
        ]);

        return response()->json(['signed_out' => true]);
    }

    public function heartbeat(Request $request): JsonResponse
    {
        /** @var StaffSession $session */
        $session = $request->attributes->get('staff_session');
        if (! $session->remembered) {
            $session->forceFill(['last_used_at' => now()])->save();
        }

        return response()->json([
            'active' => true,
            'expires_at' => $session->expires_at->toIso8601String(),
        ])->withHeaders([
            'Cache-Control' => 'no-store, private',
            'Pragma' => 'no-cache',
        ]);
    }

    private function serializeSession(StaffSession $session, StaffUser $staffUser): array
    {
        $staffUser->loadMissing('school:id,name');

        return [
            'staff' => [
                'id' => $staffUser->id,
                'username' => $staffUser->username,
                'email' => $staffUser->email,
                'email_verified_at' => $staffUser->email_verified_at?->toIso8601String(),
                'display_name' => $staffUser->display_name,
                'role' => $staffUser->role,
                'school' => $staffUser->school ? [
                    'id' => $staffUser->school->id,
                    'name' => $staffUser->school->name,
                ] : null,
                'requires_school_setup' => $staffUser->role === 'school_admin' && $staffUser->school_id === null,
                'requires_credential_setup' => $staffUser->requires_credential_setup,
                'grade_level' => $staffUser->grade_level,
                'section' => $staffUser->section,
                'requires_assignment_acknowledgement' => $staffUser->role === 'teacher'
                    && $staffUser->teacher_assignment_acknowledged_at === null,
            ],
            'session' => [
                'expires_at' => $session->expires_at->toIso8601String(),
                'remembered' => $session->remembered,
                'heartbeat_interval_seconds' => $session->remembered
                    ? null
                    : (int) config('staff.session_heartbeat_interval_seconds', 30),
            ],
        ];
    }

    private function deleteInactiveSessions(
        Builder $query,
        CarbonInterface $now,
        CarbonInterface $leaseCutoff,
    ): void {
        $query
            ->where(function ($query) use ($now, $leaseCutoff): void {
                $query
                    ->whereNotNull('revoked_at')
                    ->orWhere('expires_at', '<=', $now)
                    ->orWhere(function ($query) use ($leaseCutoff): void {
                        $query
                            ->where('remembered', false)
                            ->where(function ($query) use ($leaseCutoff): void {
                                $query
                                    ->whereNull('last_used_at')
                                    ->orWhere('last_used_at', '<=', $leaseCutoff);
                            });
                    });
            })
            ->delete();
    }
}
