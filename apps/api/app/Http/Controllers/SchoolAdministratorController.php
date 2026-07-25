<?php

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

final class SchoolAdministratorController extends Controller
{
    public function index(): JsonResponse
    {
        $accounts = StaffUser::query()
            ->where('role', 'school_admin')
            ->with('school:id,name')
            ->latest()
            ->get()
            ->map(fn (StaffUser $staffUser): array => $this->serialize($staffUser))
            ->values();

        return response()->json([
            'school_administrators' => $accounts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var StaffUser $systemAdministrator */
        $systemAdministrator = $request->user();

        $request->merge([
            'username' => mb_strtolower(trim((string) $request->input('username'))),
        ]);

        $credentials = $request->validate([
            'username' => [
                'required',
                'string',
                'min:3',
                'max:64',
                'regex:/^[a-z0-9][a-z0-9._-]*$/',
                Rule::unique('staff_users', 'username'),
            ],
            'temporary_password' => ['required', 'string', 'min:8', 'max:255'],
        ], [
            'username.regex' => 'Use letters, numbers, periods, underscores, or hyphens only.',
            'username.unique' => 'That username is already assigned to a staff account.',
        ]);

        $schoolAdministrator = DB::transaction(function () use ($credentials, $systemAdministrator): StaffUser {
            $account = StaffUser::query()->create([
                'username' => $credentials['username'],
                'password' => $credentials['temporary_password'],
                'role' => 'school_admin',
                'display_name' => 'School Administrator',
                'is_active' => true,
                'requires_credential_setup' => true,
            ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $systemAdministrator->id,
                'action_key' => 'school_administrator.created',
                'description' => "Created School Administrator account {$account->username}.",
                'metadata' => [
                    'school_administrator_id' => $account->id,
                    'username' => $account->username,
                ],
            ]);

            return $account;
        });

        return response()->json([
            'school_administrator' => $this->serialize($schoolAdministrator),
        ], 201);
    }

    private function serialize(StaffUser $staffUser): array
    {
        return [
            'id' => $staffUser->id,
            'username' => $staffUser->username,
            'display_name' => $staffUser->display_name,
            'is_active' => $staffUser->is_active,
            'school' => $staffUser->school?->name,
            'requires_school_setup' => $staffUser->school_id === null,
            'requires_credential_setup' => $staffUser->requires_credential_setup,
            'created_at' => $staffUser->created_at?->toIso8601String(),
        ];
    }
}
