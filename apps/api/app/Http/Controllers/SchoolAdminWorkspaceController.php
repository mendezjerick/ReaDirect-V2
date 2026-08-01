<?php

namespace App\Http\Controllers;

use App\Enums\StaffRealtimeTopic;
use App\Models\Learner;
use App\Models\School;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\SchoolAdminOverviewService;
use App\Services\StaffRealtimePublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminWorkspaceController extends Controller
{
    public function schoolProfile(StaffUser $staffUser): JsonResponse
    {
        $school = $this->readySchool($staffUser);

        return response()->json([
            'school' => $this->serializeSchoolProfile($school),
        ]);
    }

    public function updateSchoolProfile(
        Request $request,
        StaffUser $staffUser,
        StaffRealtimePublisher $realtime,
    ): JsonResponse {
        $school = $this->readySchool($staffUser);
        $validated = $request->validate([
            'school_name' => ['required', 'string', 'min:2', 'max:180'],
        ]);
        $schoolName = preg_replace('/\s+/', ' ', trim($validated['school_name']));
        $normalizedName = mb_strtolower($schoolName);
        $nameTaken = School::query()
            ->where('normalized_name', $normalizedName)
            ->whereKeyNot($school->id)
            ->exists();

        if ($nameTaken) {
            throw ValidationException::withMessages([
                'school_name' => 'That school name is already in use.',
            ]);
        }

        DB::transaction(function () use (
            $school,
            $schoolName,
            $normalizedName,
            $staffUser,
        ): void {
            $previousName = $school->name;
            $school->update([
                'name' => $schoolName,
                'normalized_name' => $normalizedName,
            ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'school.profile_updated',
                'description' => "Updated the school profile for {$schoolName}.",
                'metadata' => [
                    'school_id' => $school->id,
                    'previous_name' => $previousName,
                    'school_name' => $schoolName,
                ],
            ]);
        });

        $realtime->school(
            $school->id,
            StaffRealtimeTopic::Overview,
            StaffRealtimeTopic::Schools,
            StaffRealtimeTopic::SchoolProfile,
            StaffRealtimeTopic::Operations,
        );

        return response()->json([
            'school' => $this->serializeSchoolProfile($school->refresh()),
        ]);
    }

    public function updateSchool(
        Request $request,
        StaffUser $staffUser,
        StaffRealtimePublisher $realtime,
    ): JsonResponse {
        $this->assertSchoolAdministrator($staffUser);

        $validated = $request->validate([
            'school_name' => ['required', 'string', 'min:2', 'max:180'],
        ]);

        $schoolName = preg_replace('/\s+/', ' ', trim($validated['school_name']));
        $normalizedName = mb_strtolower($schoolName);

        $school = DB::transaction(function () use ($staffUser, $schoolName, $normalizedName): School {
            $school = School::query()->firstOrCreate(
                ['normalized_name' => $normalizedName],
                ['name' => $schoolName],
            );

            $staffUser->school()->associate($school);
            $staffUser->save();

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'school_administrator.school_completed',
                'description' => "Completed school setup for {$school->name}.",
                'metadata' => [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                ],
            ]);

            return $school;
        });

        $realtime->school(
            $school->id,
            StaffRealtimeTopic::Overview,
            StaffRealtimeTopic::SchoolAdministrators,
            StaffRealtimeTopic::Schools,
            StaffRealtimeTopic::SchoolProfile,
            StaffRealtimeTopic::Operations,
        );

        return response()->json([
            'staff' => [
                'id' => $staffUser->id,
                'username' => $staffUser->username,
                'email' => $staffUser->email,
                'display_name' => $staffUser->display_name,
                'role' => $staffUser->role,
                'school' => [
                    'id' => $school->id,
                    'name' => $school->name,
                ],
                'requires_school_setup' => false,
                'requires_credential_setup' => $staffUser->requires_credential_setup,
            ],
        ]);
    }

    public function overview(
        StaffUser $staffUser,
        SchoolAdminOverviewService $overview,
    ): JsonResponse {
        $this->assertSchoolAdministrator($staffUser);

        if ($staffUser->school_id === null) {
            throw new HttpException(409, 'School setup is required before opening the dashboard.');
        }

        $staffUser->load('school:id,name');

        return response()->json([
            'school' => [
                'id' => $staffUser->school->id,
                'name' => $staffUser->school->name,
            ],
            ...$overview->build($staffUser),
            'requires_credential_setup' => $staffUser->requires_credential_setup,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    private function assertSchoolAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'school_admin' || ! $staffUser->is_active) {
            abort(404);
        }
    }

    private function readySchool(StaffUser $staffUser): School
    {
        $this->assertSchoolAdministrator($staffUser);

        if ($staffUser->school_id === null) {
            throw new HttpException(
                409,
                'School setup is required before opening the school profile.',
            );
        }

        return School::query()->findOrFail($staffUser->school_id);
    }

    /** @return array<string, mixed> */
    private function serializeSchoolProfile(School $school): array
    {
        return [
            'id' => $school->id,
            'name' => $school->name,
            'teachers' => StaffUser::query()
                ->where('school_id', $school->id)
                ->where('role', 'teacher')
                ->count(),
            'learners' => Learner::query()
                ->where('school_id', $school->id)
                ->where('account_purpose', Learner::PURPOSE_STANDARD)
                ->count(),
            'created_at' => $school->created_at?->toIso8601String(),
            'updated_at' => $school->updated_at?->toIso8601String(),
        ];
    }
}
