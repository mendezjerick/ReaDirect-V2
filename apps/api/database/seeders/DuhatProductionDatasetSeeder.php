<?php

namespace Database\Seeders;

use App\Models\Learner;
use App\Models\School;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class DuhatProductionDatasetSeeder extends Seeder
{
    private const DATASET_PATH = __DIR__.'/data/duhat-production-dataset.json.gz.b64';

    private const SCHOOL_NAME = 'Duhat Elementary School';

    private const SCHOOL_NORMALIZED_NAME = 'duhat elementary school';

    private const ADMIN_USERNAME = 'des.admin';

    private const GRADE_ONE_TEACHER_USERNAME = 'g1.teacher';

    private const GRADE_THREE_TEACHER_USERNAME = 'g3.teacher';

    private const COMPLETION_MARKER = 'seed.duhat-production-v1.completed';

    public function run(): void
    {
        $dataset = $this->dataset();

        DB::transaction(function () use ($dataset): void {
            if (DB::table('system_settings')->where('key', self::COMPLETION_MARKER)->exists()) {
                return;
            }

            $systemAdministrator = StaffUser::query()
                ->where('role', 'system_admin')
                ->where('is_active', true)
                ->first();

            if ($systemAdministrator === null) {
                throw new RuntimeException(
                    'An active System Administrator is required before seeding the Duhat production dataset.',
                );
            }

            $administrator = $this->staffAccount(
                self::ADMIN_USERNAME,
                $dataset['credential_hashes'][self::ADMIN_USERNAME],
                [
                    'role' => 'school_admin',
                    'display_name' => 'DES Admin',
                    'grade_level' => null,
                    'section' => null,
                ],
            );

            $this->audit(
                $systemAdministrator,
                'school_administrator.created',
                "Created School Administrator account {$administrator->username}.",
                [
                    'school_administrator_id' => $administrator->id,
                    'username' => $administrator->username,
                    'source' => self::class,
                ],
            );

            $school = School::query()->firstOrCreate(
                ['normalized_name' => self::SCHOOL_NORMALIZED_NAME],
                ['name' => self::SCHOOL_NAME],
            );

            if ($school->name !== self::SCHOOL_NAME) {
                $school->forceFill(['name' => self::SCHOOL_NAME])->save();
            }

            if (
                $administrator->school_id !== null
                && (int) $administrator->school_id !== $school->id
            ) {
                throw new RuntimeException(
                    'The DES Admin username already belongs to a different school.',
                );
            }

            $administrator->forceFill(['school_id' => $school->id])->save();

            $this->audit(
                $administrator,
                'school_administrator.school_completed',
                "Completed school setup for {$school->name}.",
                [
                    'school_id' => $school->id,
                    'school_name' => $school->name,
                    'source' => self::class,
                ],
            );

            $teachers = [
                1 => $this->teacher(
                    $administrator,
                    $school,
                    self::GRADE_ONE_TEACHER_USERNAME,
                    'G1 Teacher',
                    1,
                    'Grade 1',
                    $dataset['credential_hashes'][self::GRADE_ONE_TEACHER_USERNAME],
                ),
                3 => $this->teacher(
                    $administrator,
                    $school,
                    self::GRADE_THREE_TEACHER_USERNAME,
                    'G3 Teacher',
                    3,
                    'Grade 3',
                    $dataset['credential_hashes'][self::GRADE_THREE_TEACHER_USERNAME],
                ),
            ];

            $learnerIds = $this->learners($dataset, $school, $teachers);
            $this->learnerImportAudit($teachers[1], $learnerIds, 1, 'Grade 1');
            $this->learnerImportAudit($teachers[3], $learnerIds, 3, 'Grade 3');

            $this->progress($dataset, $learnerIds);
            $this->assessments($dataset, $learnerIds);
            $this->lessons($dataset, $learnerIds);
            $this->achievements($dataset, $learnerIds);

            DB::table('system_settings')->insert([
                'key' => self::COMPLETION_MARKER,
                'value' => json_encode([
                    'school_id' => $school->id,
                    'learner_count' => count($learnerIds),
                    'seeded_at' => now()->toIso8601String(),
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    /** @param array<string, mixed> $values */
    private function staffAccount(
        string $username,
        string $passwordHash,
        array $values,
    ): StaffUser {
        $staffUser = StaffUser::query()->firstOrNew(['username' => $username]);

        if ($staffUser->exists && $staffUser->role !== $values['role']) {
            throw new RuntimeException(
                "Staff username {$username} already belongs to a different role.",
            );
        }

        if (
            $staffUser->exists
            && array_key_exists('school_id', $values)
            && $staffUser->school_id !== null
            && (int) $staffUser->school_id !== (int) $values['school_id']
        ) {
            throw new RuntimeException(
                "Staff username {$username} already belongs to a different school.",
            );
        }

        if (! $staffUser->exists) {
            $staffUser->password = $passwordHash;
            $staffUser->requires_credential_setup = true;
        }

        $staffUser->forceFill([
            ...$values,
            'is_active' => true,
        ])->save();

        return $staffUser;
    }

    private function teacher(
        StaffUser $administrator,
        School $school,
        string $username,
        string $displayName,
        int $gradeLevel,
        string $section,
        string $passwordHash,
    ): StaffUser {
        $teacher = $this->staffAccount($username, $passwordHash, [
            'role' => 'teacher',
            'display_name' => $displayName,
            'school_id' => $school->id,
            'grade_level' => $gradeLevel,
            'section' => $section,
        ]);

        $this->audit(
            $administrator,
            'teacher.created',
            "Created Teacher account {$teacher->username} for Grade {$gradeLevel} Section {$section}.",
            [
                'teacher_id' => $teacher->id,
                'username' => $teacher->username,
                'school_id' => $school->id,
                'grade_level' => $gradeLevel,
                'section' => $section,
                'source' => self::class,
            ],
        );

        return $teacher;
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @param  array<int, StaffUser>  $teachers
     * @return array<int, int>
     */
    private function learners(array $dataset, School $school, array $teachers): array
    {
        $learnerIds = [];

        foreach ($dataset['learners'] as $sourceLearner) {
            $sourceId = (int) $sourceLearner['id'];
            $gradeLevel = (int) $sourceLearner['grade_level'];
            $learnerCode = $sourceLearner['learner_code'];
            $teacher = $teachers[$gradeLevel] ?? null;

            if ($teacher === null) {
                throw new RuntimeException("No Duhat teacher is configured for Grade {$gradeLevel}.");
            }

            $learner = Learner::query()->firstOrNew(['learner_code' => $learnerCode]);

            if (
                $learner->exists
                && $learner->school_id !== null
                && (int) $learner->school_id !== $school->id
            ) {
                throw new RuntimeException(
                    "Learner code {$learnerCode} already belongs to a different school.",
                );
            }

            if (! $learner->exists) {
                $learner->password = $dataset['credential_hashes'][$learnerCode];
            }

            $learner->forceFill([
                'account_purpose' => Learner::PURPOSE_STANDARD,
                'speech_language' => $sourceLearner['speech_language'],
                'first_name' => $sourceLearner['first_name'],
                'middle_name' => $sourceLearner['middle_name'],
                'last_name' => $sourceLearner['last_name'],
                'suffix' => $sourceLearner['suffix'],
                'lrn' => $sourceLearner['lrn'],
                'school_id' => $school->id,
                'teacher_id' => $teacher->id,
                'grade_level' => $gradeLevel,
                'section' => "Grade {$gradeLevel}",
                'is_active' => true,
                'progress_reset_at' => $sourceLearner['progress_reset_at'],
            ])->save();

            $learnerIds[$sourceId] = $learner->id;
        }

        return $learnerIds;
    }

    /** @param array<int, int> $learnerIds */
    private function learnerImportAudit(
        StaffUser $teacher,
        array $learnerIds,
        int $gradeLevel,
        string $section,
    ): void {
        $gradeLearnerIds = Learner::query()
            ->whereIn('id', array_values($learnerIds))
            ->where('teacher_id', $teacher->id)
            ->orderBy('learner_code')
            ->pluck('id')
            ->all();

        $this->audit(
            $teacher,
            'learner.imported',
            'Imported '.count($gradeLearnerIds).' Learner accounts.',
            [
                'learner_ids' => $gradeLearnerIds,
                'learner_count' => count($gradeLearnerIds),
                'school_id' => $teacher->school_id,
                'grade_level' => $gradeLevel,
                'section' => $section,
                'source' => self::class,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @param  array<int, int>  $learnerIds
     */
    private function progress(array $dataset, array $learnerIds): void
    {
        foreach ($dataset['progress'] as $sourceProgress) {
            $learnerId = $learnerIds[(int) $sourceProgress['learner_id']];
            $values = $this->without($sourceProgress, ['id', 'learner_id']);

            DB::table('learner_progress_states')->insertOrIgnore([
                'learner_id' => $learnerId,
                ...$values,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @param  array<int, int>  $learnerIds
     */
    private function assessments(array $dataset, array $learnerIds): void
    {
        $runIds = [];

        foreach ($dataset['assessment_runs'] as $sourceRun) {
            $sourceRunId = (int) $sourceRun['id'];
            $learnerId = $learnerIds[(int) $sourceRun['learner_id']];
            $existingId = DB::table('assessment_runs')
                ->where('learner_id', $learnerId)
                ->where('assessment_type', $sourceRun['assessment_type'])
                ->where('content_version', $sourceRun['content_version'])
                ->where('status', $sourceRun['status'])
                ->value('id');

            $runIds[$sourceRunId] = $existingId !== null
                ? (int) $existingId
                : (int) DB::table('assessment_runs')->insertGetId([
                    'learner_id' => $learnerId,
                    ...$this->without($sourceRun, ['id', 'learner_id']),
                ]);
        }

        foreach ($dataset['assessment_responses'] as $sourceResponse) {
            $runId = $runIds[(int) $sourceResponse['assessment_run_id']];
            $values = $this->without(
                $sourceResponse,
                ['id', 'source_learner_id', 'assessment_run_id'],
            );

            DB::table('assessment_responses')->insertOrIgnore([
                'assessment_run_id' => $runId,
                ...$values,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @param  array<int, int>  $learnerIds
     */
    private function lessons(array $dataset, array $learnerIds): void
    {
        $runIds = [];
        $responseIds = [];

        foreach ($dataset['lesson_runs'] as $sourceRun) {
            $sourceRunId = (int) $sourceRun['id'];
            $learnerId = $learnerIds[(int) $sourceRun['learner_id']];
            $existingId = DB::table('lesson_runs')
                ->where('learner_id', $learnerId)
                ->where('lesson_key', $sourceRun['lesson_key'])
                ->where('content_version', $sourceRun['content_version'])
                ->where('status', $sourceRun['status'])
                ->value('id');

            $runIds[$sourceRunId] = $existingId !== null
                ? (int) $existingId
                : (int) DB::table('lesson_runs')->insertGetId([
                    'learner_id' => $learnerId,
                    ...$this->without($sourceRun, ['id', 'learner_id']),
                ]);
        }

        foreach ($dataset['lesson_responses'] as $sourceResponse) {
            $sourceResponseId = (int) $sourceResponse['id'];
            $runId = $runIds[(int) $sourceResponse['lesson_run_id']];
            $existingId = DB::table('lesson_responses')
                ->where('lesson_run_id', $runId)
                ->where('mission_key', $sourceResponse['mission_key'])
                ->where('item_key', $sourceResponse['item_key'])
                ->value('id');

            $responseIds[$sourceResponseId] = $existingId !== null
                ? (int) $existingId
                : (int) DB::table('lesson_responses')->insertGetId([
                    'lesson_run_id' => $runId,
                    ...$this->without(
                        $sourceResponse,
                        ['id', 'source_learner_id', 'lesson_run_id'],
                    ),
                ]);
        }

        foreach ($dataset['lesson_item_attempts'] as $sourceAttempt) {
            $responseId = $responseIds[(int) $sourceAttempt['lesson_response_id']];
            $values = $this->without(
                $sourceAttempt,
                ['id', 'source_learner_id', 'lesson_response_id'],
            );

            DB::table('lesson_item_attempts')->insertOrIgnore([
                'lesson_response_id' => $responseId,
                ...$values,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @param  array<int, int>  $learnerIds
     */
    private function achievements(array $dataset, array $learnerIds): void
    {
        foreach ($dataset['achievements'] as $sourceAchievement) {
            $learnerId = $learnerIds[(int) $sourceAchievement['learner_id']];
            $values = $this->without($sourceAchievement, ['id', 'learner_id']);

            DB::table('learner_achievements')->insertOrIgnore([
                'learner_id' => $learnerId,
                ...$values,
            ]);
        }
    }

    /** @param array<string, mixed> $metadata */
    private function audit(
        StaffUser $staffUser,
        string $actionKey,
        string $description,
        array $metadata,
    ): void {
        StaffAuditLog::query()->firstOrCreate(
            [
                'staff_user_id' => $staffUser->id,
                'action_key' => $actionKey,
                'description' => $description,
            ],
            ['metadata' => $metadata],
        );
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<int, string>  $keys
     * @return array<string, mixed>
     */
    private function without(array $row, array $keys): array
    {
        foreach ($keys as $key) {
            unset($row[$key]);
        }

        return $row;
    }

    /** @return array<string, mixed> */
    private function dataset(): array
    {
        $encoded = file_get_contents(self::DATASET_PATH);

        if ($encoded === false) {
            throw new RuntimeException('The Duhat production dataset fixture is missing.');
        }

        $compressed = base64_decode(preg_replace('/\s+/', '', $encoded), true);
        $json = $compressed === false ? false : gzdecode($compressed);

        if ($json === false) {
            throw new RuntimeException('The Duhat production dataset fixture is invalid.');
        }

        $dataset = json_decode($json, true, flags: JSON_THROW_ON_ERROR);

        if (
            count($dataset['learners'] ?? []) !== 20
            || count($dataset['credential_hashes'] ?? []) !== 23
        ) {
            throw new RuntimeException('The Duhat production dataset fixture is incomplete.');
        }

        return $dataset;
    }
}
