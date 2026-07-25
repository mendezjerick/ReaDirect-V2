<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminClassController extends Controller
{
    public function index(StaffUser $staffUser): JsonResponse
    {
        $this->assertReadyAdministrator($staffUser);

        $teachers = StaffUser::query()
            ->where('role', 'teacher')
            ->where('school_id', $staffUser->school_id)
            ->withCount([
                'learners as learner_count' => fn ($query) => $query
                    ->where('account_purpose', Learner::PURPOSE_STANDARD),
                'learners as active_learner_count' => fn ($query) => $query
                    ->where('account_purpose', Learner::PURPOSE_STANDARD)
                    ->where('is_active', true),
            ])
            ->orderBy('grade_level')
            ->orderBy('section')
            ->orderBy('id')
            ->get()
            ->map(fn (StaffUser $teacher): array => $this->serialize($teacher))
            ->values();

        return response()->json(['classes' => $teachers]);
    }

    public function update(
        Request $request,
        StaffUser $staffUser,
        StaffUser $teacher,
    ): JsonResponse {
        $this->assertReadyAdministrator($staffUser);
        $this->assertTeacherInSchool($staffUser, $teacher);

        $request->merge([
            'section' => preg_replace(
                '/\s+/',
                ' ',
                trim((string) $request->input('section')),
            ),
        ]);
        $validated = $request->validate([
            'grade_level' => ['required', 'integer', 'between:1,6'],
            'section' => ['required', 'string', 'max:80'],
        ]);

        DB::transaction(function () use (
            $staffUser,
            $teacher,
            $validated,
        ): void {
            $previous = [
                'grade_level' => $teacher->grade_level,
                'section' => $teacher->section,
            ];
            $teacher->update([
                'grade_level' => $validated['grade_level'],
                'section' => $validated['section'],
                'teacher_assignment_acknowledged_at' => null,
            ]);

            Learner::query()
                ->where('teacher_id', $teacher->id)
                ->where('school_id', $staffUser->school_id)
                ->where('account_purpose', Learner::PURPOSE_STANDARD)
                ->update([
                    'grade_level' => $validated['grade_level'],
                    'section' => $validated['section'],
                ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'class.assignment_updated',
                'description' => "Updated {$teacher->username}'s Grade {$validated['grade_level']} {$validated['section']} assignment.",
                'metadata' => [
                    'teacher_id' => $teacher->id,
                    'school_id' => $staffUser->school_id,
                    'previous' => $previous,
                    'current' => [
                        'grade_level' => $validated['grade_level'],
                        'section' => $validated['section'],
                    ],
                    'learner_flow_records_changed' => false,
                ],
            ]);
        });

        $teacher->loadCount([
            'learners as learner_count' => fn ($query) => $query
                ->where('account_purpose', Learner::PURPOSE_STANDARD),
            'learners as active_learner_count' => fn ($query) => $query
                ->where('account_purpose', Learner::PURPOSE_STANDARD)
                ->where('is_active', true),
        ]);

        return response()->json(['class' => $this->serialize($teacher)]);
    }

    private function assertReadyAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'school_admin' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null) {
            throw new HttpException(
                409,
                'School setup is required before managing classes.',
            );
        }
    }

    private function assertTeacherInSchool(
        StaffUser $administrator,
        StaffUser $teacher,
    ): void {
        if (
            $teacher->role !== 'teacher'
            || $teacher->school_id !== $administrator->school_id
        ) {
            abort(404);
        }
    }

    /** @return array<string, mixed> */
    private function serialize(StaffUser $teacher): array
    {
        return [
            'id' => $teacher->id,
            'teacher_name' => $teacher->display_name,
            'username' => $teacher->username,
            'grade_level' => $teacher->grade_level,
            'section' => $teacher->section,
            'is_active' => (bool) $teacher->is_active,
            'learner_count' => (int) ($teacher->learner_count ?? 0),
            'active_learner_count' => (int) (
                $teacher->active_learner_count ?? 0
            ),
        ];
    }
}
