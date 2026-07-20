<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\School;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminWorkspaceController extends Controller
{
    public function updateSchool(Request $request, StaffUser $staffUser): JsonResponse
    {
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

    public function overview(StaffUser $staffUser): JsonResponse
    {
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
            'metrics' => [
                'total_teachers' => StaffUser::query()
                    ->where('role', 'teacher')
                    ->where('school_id', $staffUser->school_id)
                    ->count(),
                'total_learners' => Learner::query()
                    ->where('account_purpose', Learner::PURPOSE_STANDARD)
                    ->where('school_id', $staffUser->school_id)
                    ->count(),
                'active_learners' => Learner::query()
                    ->where('account_purpose', Learner::PURPOSE_STANDARD)
                    ->where('school_id', $staffUser->school_id)
                    ->where('is_active', true)
                    ->count(),
            ],
            'part_one_distribution' => [
                ['label' => 'Full Refresher', 'value' => 0],
                ['label' => 'Moderate Refresher', 'value' => 0],
                ['label' => 'Light Refresher', 'value' => 0],
                ['label' => 'Grade Ready', 'value' => 0],
            ],
            'recent_assessment_activity' => [],
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
}
