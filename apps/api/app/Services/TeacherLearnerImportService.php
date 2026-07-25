<?php

namespace App\Services;

use App\Models\Learner;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class TeacherLearnerImportService
{
    public function __construct(
        private readonly LearnerCodeGenerator $codeGenerator,
        private readonly LearnerTemporaryPasswordGenerator $passwordGenerator,
    ) {}

    /**
     * @param  array<int, array<string, string|null>>  $profiles
     * @return Collection<int, array<string, int|string|null>>
     */
    public function import(StaffUser $teacher, array $profiles): Collection
    {
        return DB::transaction(function () use ($profiles, $teacher): Collection {
            $credentials = collect();
            $learnerIds = [];

            foreach ($profiles as $profile) {
                $temporaryPassword = $this->passwordGenerator->generate();
                $learner = Learner::query()->create([
                    ...$profile,
                    'learner_code' => $this->codeGenerator->next(),
                    'account_purpose' => Learner::PURPOSE_STANDARD,
                    'password' => $temporaryPassword,
                    'school_id' => $teacher->school_id,
                    'teacher_id' => $teacher->id,
                    'grade_level' => $teacher->grade_level,
                    'section' => $teacher->section,
                    'is_active' => true,
                ]);
                $learnerIds[] = $learner->id;
                $credentials->push([
                    'id' => $learner->id,
                    'learner_code' => $learner->learner_code,
                    'full_name' => $this->fullName($learner),
                    'temporary_password' => $temporaryPassword,
                ]);
            }

            StaffAuditLog::query()->create([
                'staff_user_id' => $teacher->id,
                'action_key' => 'learner.imported',
                'description' => 'Imported '.count($learnerIds).' Learner accounts.',
                'metadata' => [
                    'learner_ids' => $learnerIds,
                    'learner_count' => count($learnerIds),
                    'school_id' => $teacher->school_id,
                    'grade_level' => $teacher->grade_level,
                    'section' => $teacher->section,
                ],
            ]);

            return $credentials;
        });
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
