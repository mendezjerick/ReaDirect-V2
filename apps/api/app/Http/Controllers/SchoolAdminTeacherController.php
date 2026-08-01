<?php

namespace App\Http\Controllers;

use App\Enums\StaffRealtimeTopic;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\StaffRealtimePublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminTeacherController extends Controller
{
    public function index(StaffUser $staffUser): JsonResponse
    {
        $this->assertReadySchoolAdministrator($staffUser);

        $teachers = StaffUser::query()
            ->where('role', 'teacher')
            ->where('school_id', $staffUser->school_id)
            ->latest()
            ->get()
            ->map(fn (StaffUser $teacher): array => $this->serialize($teacher))
            ->values();

        return response()->json([
            'teachers' => $teachers,
        ]);
    }

    public function store(
        Request $request,
        StaffUser $staffUser,
        StaffRealtimePublisher $realtime,
    ): JsonResponse {
        $this->assertReadySchoolAdministrator($staffUser);

        $request->merge([
            'username' => mb_strtolower(trim((string) $request->input('username'))),
            'section' => preg_replace('/\s+/', ' ', trim((string) $request->input('section'))),
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
            'grade_level' => ['required', 'integer', 'between:1,6'],
            'section' => ['required', 'string', 'max:80'],
        ], [
            'username.regex' => 'Use letters, numbers, periods, underscores, or hyphens only.',
            'username.unique' => 'That username is already assigned to a staff account.',
            'grade_level.between' => 'Choose a grade level from Grade 1 to Grade 6.',
        ]);

        $teacher = DB::transaction(function () use ($credentials, $staffUser): StaffUser {
            $account = StaffUser::query()->create([
                'username' => $credentials['username'],
                'password' => $credentials['temporary_password'],
                'role' => 'teacher',
                'school_id' => $staffUser->school_id,
                'grade_level' => $credentials['grade_level'],
                'section' => $credentials['section'],
                'display_name' => 'Teacher',
                'is_active' => true,
                'requires_credential_setup' => true,
            ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'teacher.created',
                'description' => "Created Teacher account {$account->username} for Grade {$account->grade_level} Section {$account->section}.",
                'metadata' => [
                    'teacher_id' => $account->id,
                    'username' => $account->username,
                    'school_id' => $account->school_id,
                    'grade_level' => $account->grade_level,
                    'section' => $account->section,
                ],
            ]);

            return $account;
        });

        $realtime->school(
            $staffUser->school_id,
            StaffRealtimeTopic::Overview,
            StaffRealtimeTopic::Classes,
            StaffRealtimeTopic::Teachers,
            StaffRealtimeTopic::Operations,
        );

        return response()->json([
            'teacher' => $this->serialize($teacher),
        ], 201);
    }

    private function assertReadySchoolAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'school_admin' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null) {
            throw new HttpException(409, 'School setup is required before creating Teacher accounts.');
        }
    }

    private function serialize(StaffUser $teacher): array
    {
        return [
            'id' => $teacher->id,
            'username' => $teacher->username,
            'display_name' => $teacher->display_name,
            'is_active' => $teacher->is_active,
            'grade_level' => $teacher->grade_level,
            'section' => $teacher->section,
            'requires_credential_setup' => $teacher->requires_credential_setup,
            'created_at' => $teacher->created_at?->toIso8601String(),
        ];
    }
}
