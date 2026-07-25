<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\StaffUser;
use App\Services\TeacherLearnerDetailService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminLearnerController extends Controller
{
    public function __construct(
        private readonly TeacherLearnerDetailService $details,
    ) {}

    public function index(StaffUser $staffUser): JsonResponse
    {
        $this->assertReadyAdministrator($staffUser);

        $learners = Learner::query()
            ->with(['teacher:id,username,display_name', 'progressState'])
            ->where('school_id', $staffUser->school_id)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Learner $learner): array => [
                'id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'full_name' => $this->fullName($learner),
                'grade_level' => $learner->grade_level,
                'section' => $learner->section,
                'is_active' => (bool) $learner->is_active,
                'progress_stage' => $learner->progressState?->stage
                    ?? LearnerProgressState::BASELINE_STAGE,
                'teacher' => $learner->teacher ? [
                    'id' => $learner->teacher->id,
                    'name' => $learner->teacher->display_name,
                    'username' => $learner->teacher->username,
                ] : null,
            ])
            ->values();

        return response()->json(['learners' => $learners]);
    }

    public function show(
        StaffUser $staffUser,
        Learner $learner,
    ): JsonResponse {
        $this->assertReadyAdministrator($staffUser);
        $this->assertLearnerInSchool($staffUser, $learner);
        $detail = $this->details->build($learner);
        $learner->loadMissing('teacher:id,username,display_name');
        $detail['class_context']['teacher'] = $learner->teacher ? [
            'id' => $learner->teacher->id,
            'name' => $learner->teacher->display_name,
            'username' => $learner->teacher->username,
        ] : null;

        return response()->json($detail);
    }

    private function assertReadyAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'school_admin' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null) {
            throw new HttpException(
                409,
                'School setup is required before reviewing Learners.',
            );
        }
    }

    private function assertLearnerInSchool(
        StaffUser $administrator,
        Learner $learner,
    ): void {
        if (
            $learner->account_purpose !== Learner::PURPOSE_STANDARD
            || $learner->school_id !== $administrator->school_id
        ) {
            abort(404);
        }
    }

    private function fullName(Learner $learner): string
    {
        return implode(' ', array_filter([
            $learner->first_name,
            $learner->middle_name,
            $learner->last_name,
            $learner->suffix,
        ]));
    }
}
