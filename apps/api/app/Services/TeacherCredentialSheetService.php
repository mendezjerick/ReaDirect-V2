<?php

namespace App\Services;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class TeacherCredentialSheetService
{
    public function __construct(
        private readonly LearnerTemporaryPasswordGenerator $passwordGenerator,
    ) {}

    /**
     * @param  array<int, int>  $learnerIds
     * @return Collection<int, array<string, int|string>>
     */
    public function issue(StaffUser $teacher, array $learnerIds): Collection
    {
        return DB::transaction(function () use ($learnerIds, $teacher): Collection {
            $learners = Learner::query()
                ->whereIn('id', $learnerIds)
                ->where('teacher_id', $teacher->id)
                ->where('account_purpose', Learner::PURPOSE_STANDARD)
                ->where('is_active', true)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($learners->count() !== count($learnerIds)) {
                abort(404);
            }

            $issuedAt = now();
            $credentials = collect($learnerIds)->map(function (int $learnerId) use (
                $issuedAt,
                $learners,
            ): array {
                /** @var Learner $learner */
                $learner = $learners->get($learnerId);
                $temporaryPassword = $this->passwordGenerator->generate();
                $learner->forceFill(['password' => $temporaryPassword])->save();
                LearnerSession::query()
                    ->where('learner_id', $learner->id)
                    ->whereNull('revoked_at')
                    ->update(['revoked_at' => $issuedAt]);

                return [
                    'id' => $learner->id,
                    'learner_code' => $learner->learner_code,
                    'full_name' => $this->fullName($learner),
                    'temporary_password' => $temporaryPassword,
                ];
            });

            StaffAuditLog::query()->create([
                'staff_user_id' => $teacher->id,
                'action_key' => 'learner.credentials_issued',
                'description' => 'Issued a credential sheet for '.count($learnerIds).' Learners.',
                'metadata' => [
                    'learner_ids' => $learnerIds,
                    'learner_count' => count($learnerIds),
                    'sessions_revoked' => true,
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
