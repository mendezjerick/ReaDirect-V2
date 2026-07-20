<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\LearnerCodeGenerator;
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

    public function store(
        Request $request,
        StaffUser $staffUser,
        LearnerCodeGenerator $learnerCodeGenerator,
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

        $temporaryPassword = $this->generatePassword();

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

    private function generatePassword(): string
    {
        $fruits = ['apple', 'orange', 'lemon'];
        $fruit = $fruits[random_int(0, count($fruits) - 1)];
        $number = str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);

        return $fruit.$number;
    }

    private function serialize(Learner $learner): array
    {
        $fullName = implode(' ', array_filter([
            $learner->first_name,
            $learner->middle_name,
            $learner->last_name,
            $learner->suffix,
        ]));

        return [
            'id' => $learner->id,
            'learner_code' => $learner->learner_code,
            'first_name' => $learner->first_name,
            'middle_name' => $learner->middle_name,
            'last_name' => $learner->last_name,
            'suffix' => $learner->suffix,
            'full_name' => $fullName,
            'lrn' => $learner->lrn,
            'grade_level' => $learner->grade_level,
            'section' => $learner->section,
            'is_active' => $learner->is_active,
            'created_at' => $learner->created_at?->toIso8601String(),
        ];
    }
}
