<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\LearnerCodeGenerator;
use App\Services\LearnerTemporaryPasswordGenerator;
use App\Services\TeacherCredentialSheetService;
use App\Services\TeacherLearnerDetailService;
use App\Services\TeacherLearnerImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TeacherLearnerController extends Controller
{
    public function index(StaffUser $staffUser): JsonResponse
    {
        $this->assertReadyTeacher($staffUser);

        $learners = Learner::query()
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->where('teacher_id', $staffUser->id)
            ->latest()
            ->get()
            ->map(fn (Learner $learner): array => $this->serialize($learner))
            ->values();

        return response()->json([
            'learners' => $learners,
        ]);
    }

    public function show(
        StaffUser $staffUser,
        int $learner,
        TeacherLearnerDetailService $detail,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);

        $assignedLearner = Learner::query()
            ->whereKey($learner)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->where('teacher_id', $staffUser->id)
            ->firstOrFail();

        return response()->json($detail->build($assignedLearner));
    }

    public function store(
        Request $request,
        StaffUser $staffUser,
        LearnerCodeGenerator $learnerCodeGenerator,
        LearnerTemporaryPasswordGenerator $passwordGenerator,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);

        $request->merge([
            'first_name' => $this->normalizeRequiredText($request->input('first_name')),
            'middle_name' => $this->normalizeRequiredText($request->input('middle_name')),
            'last_name' => $this->normalizeRequiredText($request->input('last_name')),
            'suffix' => $this->normalizeOptionalText($request->input('suffix')),
            'lrn' => $this->normalizeOptionalText($request->input('lrn')),
        ]);

        $profile = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'lrn' => ['nullable', 'string', 'max:50'],
        ]);

        $temporaryPassword = $passwordGenerator->generate();

        $learner = DB::transaction(function () use (
            $learnerCodeGenerator,
            $profile,
            $staffUser,
            $temporaryPassword,
        ): Learner {
            $learner = Learner::query()->create([
                ...$profile,
                'learner_code' => $learnerCodeGenerator->next(),
                'account_purpose' => Learner::PURPOSE_STANDARD,
                'password' => $temporaryPassword,
                'school_id' => $staffUser->school_id,
                'teacher_id' => $staffUser->id,
                'grade_level' => $staffUser->grade_level,
                'section' => $staffUser->section,
                'is_active' => true,
            ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'learner.created',
                'description' => "Created Learner {$learner->learner_code} for Grade {$learner->grade_level} Section {$learner->section}.",
                'metadata' => [
                    'learner_id' => $learner->id,
                    'learner_code' => $learner->learner_code,
                    'school_id' => $learner->school_id,
                    'grade_level' => $learner->grade_level,
                    'section' => $learner->section,
                ],
            ]);

            return $learner;
        });

        return response()->json([
            'learner' => [
                ...$this->serialize($learner),
                'temporary_password' => $temporaryPassword,
            ],
        ], 201);
    }

    public function resetPassword(
        StaffUser $staffUser,
        int $learner,
        LearnerTemporaryPasswordGenerator $passwordGenerator,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);

        $assignedLearner = Learner::query()
            ->whereKey($learner)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->where('teacher_id', $staffUser->id)
            ->where('is_active', true)
            ->firstOrFail();
        $temporaryPassword = $passwordGenerator->generate();
        $resetAt = now();

        DB::transaction(function () use (
            $assignedLearner,
            $resetAt,
            $staffUser,
            $temporaryPassword,
        ): void {
            $assignedLearner->forceFill([
                'password' => $temporaryPassword,
            ])->save();

            LearnerSession::query()
                ->where('learner_id', $assignedLearner->id)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => $resetAt]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'learner.password_reset',
                'description' => "Reset the password for Learner {$assignedLearner->learner_code}.",
                'metadata' => [
                    'learner_id' => $assignedLearner->id,
                    'learner_code' => $assignedLearner->learner_code,
                    'revoked_sessions' => true,
                ],
            ]);
        });

        return response()->json([
            'learner' => [
                'id' => $assignedLearner->id,
                'learner_code' => $assignedLearner->learner_code,
                'full_name' => $this->fullName($assignedLearner),
                'temporary_password' => $temporaryPassword,
            ],
        ]);
    }

    public function import(
        Request $request,
        StaffUser $staffUser,
        TeacherLearnerImportService $importer,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);

        $normalizedLearners = collect($request->input('learners', []))
            ->map(fn (mixed $profile): array => [
                'first_name' => $this->normalizeRequiredText(data_get($profile, 'first_name')),
                'middle_name' => $this->normalizeRequiredText(data_get($profile, 'middle_name')),
                'last_name' => $this->normalizeRequiredText(data_get($profile, 'last_name')),
                'suffix' => $this->normalizeOptionalText(data_get($profile, 'suffix')),
                'lrn' => $this->normalizeOptionalText(data_get($profile, 'lrn')),
            ])
            ->all();
        $request->merge(['learners' => $normalizedLearners]);

        $validated = $request->validate([
            'learners' => ['required', 'array', 'min:1', 'max:100'],
            'learners.*.first_name' => ['required', 'string', 'max:80'],
            'learners.*.middle_name' => ['required', 'string', 'max:80'],
            'learners.*.last_name' => ['required', 'string', 'max:80'],
            'learners.*.suffix' => ['nullable', 'string', 'max:20'],
            'learners.*.lrn' => ['nullable', 'string', 'max:50'],
        ]);

        return response()->json([
            'learners' => $importer->import($staffUser, $validated['learners']),
        ], 201);
    }

    public function credentialSheet(
        Request $request,
        StaffUser $staffUser,
        TeacherCredentialSheetService $credentialSheets,
    ): JsonResponse {
        $this->assertReadyTeacher($staffUser);

        $validated = $request->validate([
            'learner_ids' => ['required', 'array', 'min:1', 'max:50'],
            'learner_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        return response()->json([
            'learners' => $credentialSheets->issue($staffUser, $validated['learner_ids']),
        ]);
    }

    private function assertReadyTeacher(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'teacher' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null || $staffUser->grade_level === null || $staffUser->section === null) {
            throw new HttpException(409, 'A school, grade level, and section assignment are required before creating Learners.');
        }
    }

    private function normalizeRequiredText(mixed $value): string
    {
        return preg_replace('/\s+/', ' ', trim((string) $value));
    }

    private function normalizeOptionalText(mixed $value): ?string
    {
        $normalized = preg_replace('/\s+/', ' ', trim((string) $value));

        return $normalized === '' ? null : $normalized;
    }

    private function serialize(Learner $learner): array
    {
        return [
            'id' => $learner->id,
            'learner_code' => $learner->learner_code,
            'first_name' => $learner->first_name,
            'middle_name' => $learner->middle_name,
            'last_name' => $learner->last_name,
            'suffix' => $learner->suffix,
            'full_name' => $this->fullName($learner),
            'lrn' => $learner->lrn,
            'grade_level' => $learner->grade_level,
            'section' => $learner->section,
            'is_active' => $learner->is_active,
            'created_at' => $learner->created_at?->toIso8601String(),
        ];
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
