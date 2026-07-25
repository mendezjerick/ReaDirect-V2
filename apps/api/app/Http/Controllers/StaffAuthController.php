<?php

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffSession;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => 'staff.login',
            'description' => 'Signed in to the development staff workspace.',
            'metadata' => [
                'ip_address' => $request->ip(),
            ],
        ]);

        StaffSession::query()
            ->where('staff_user_id', $staffUser->id)
            ->where(function ($query): void {
                $query
                    ->whereNotNull('revoked_at')
                    ->orWhere('expires_at', '<=', now());
            })
            ->delete();

        $plainToken = Str::random(64);
        $session = StaffSession::query()->create([
            'staff_user_id' => $staffUser->id,
            'token_hash' => hash('sha256', $plainToken),
            'last_used_at' => now(),
            'expires_at' => now()->addHours(max(1, (int) config('staff.session_lifetime_hours', 8))),
        ]);

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

    private function serializeSession(StaffSession $session, StaffUser $staffUser): array
    {
        $staffUser->loadMissing('school:id,name');

        return [
            'staff' => [
                'id' => $staffUser->id,
                'username' => $staffUser->username,
                'email' => $staffUser->email,
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
            ],
        ];
    }
}
