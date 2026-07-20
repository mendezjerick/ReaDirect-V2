<?php

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

        $staffUser->load('school:id,name');

        return response()->json([
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
        ]);
    }
}
