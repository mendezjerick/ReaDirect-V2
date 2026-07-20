<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\StaffUser;
use App\Services\LearnerProgressResetService;
use Illuminate\Http\JsonResponse;

final class SystemAdminPortalController extends Controller
{
    public function show(StaffUser $staffUser): JsonResponse
    {
        $this->assertSystemAdministrator($staffUser);

        return response()->json($this->serialize($this->portalLearner()));
    }

    public function reset(
        StaffUser $staffUser,
        LearnerProgressResetService $resetService,
    ): JsonResponse {
        $this->assertSystemAdministrator($staffUser);
        $learner = $resetService->reset($this->portalLearner(), $staffUser);

        return response()->json([
            'message' => 'Kristen was reset to before the Diagnostic Assessment.',
            ...$this->serialize($learner),
        ]);
    }

    private function assertSystemAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'system_admin' || ! $staffUser->is_active) {
            abort(404);
        }
    }

    private function portalLearner(): Learner
    {
        return Learner::query()
            ->where('learner_code', 'KW000')
            ->where('account_purpose', Learner::PURPOSE_PORTAL_SYSTEM)
            ->firstOrFail();
    }

    private function serialize(Learner $learner): array
    {
        $progress = LearnerProgressState::query()->firstOrCreate(
            ['learner_id' => $learner->id],
            ['stage' => LearnerProgressState::BASELINE_STAGE],
        );
        $activePortalRun = LearnerPortalRun::query()
            ->where('learner_id', $learner->id)
            ->where('status', LearnerPortalRun::ACTIVE_STATUS)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        return [
            'learner' => [
                'id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'full_name' => implode(' ', [
                    $learner->first_name,
                    $learner->middle_name,
                    $learner->last_name,
                ]),
                'account_purpose' => $learner->account_purpose,
                'is_active' => $learner->is_active,
                'analytics_excluded' => true,
                'progress_stage' => $progress->stage,
                'last_reset_at' => $learner->progress_reset_at?->toIso8601String(),
                'active_standard_sessions' => LearnerSession::query()
                    ->where('learner_id', $learner->id)
                    ->where('session_type', 'standard')
                    ->whereNull('revoked_at')
                    ->where('expires_at', '>', now())
                    ->count(),
                'active_portal_run' => $activePortalRun ? [
                    'id' => $activePortalRun->id,
                    'target_key' => $activePortalRun->target_key,
                    'started_at' => $activePortalRun->started_at->toIso8601String(),
                    'expires_at' => $activePortalRun->expires_at->toIso8601String(),
                ] : null,
            ],
            'portal_launch' => [
                'available' => false,
                'reason' => 'Portal destinations will activate after assessment and lesson save records are implemented.',
            ],
        ];
    }
}
