<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\StaffUser;
use App\Services\LearnerPortalLaunchService;
use App\Services\LearnerProgressResetService;
use App\Services\LearnerReadingPathService;
use App\Services\LearnerSessionResolver;
use App\Support\SpeechLanguage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class SystemAdminPortalController extends Controller
{
    public function __construct(
        private readonly LearnerReadingPathService $readingPaths,
    ) {}

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

    public function launch(
        Request $request,
        StaffUser $staffUser,
        LearnerPortalLaunchService $launchService,
    ): JsonResponse {
        $this->assertSystemAdministrator($staffUser);
        $validated = $request->validate([
            'target_key' => [
                'required',
                'string',
                Rule::in(array_column(LearnerPortalLaunchService::targets(), 'key')),
            ],
        ]);
        $launch = $launchService->launch(
            $this->portalLearner(),
            $staffUser,
            $validated['target_key'],
        );
        $learner = $launch['learner'];

        $response = response()->json([
            'message' => "Kristen is ready at {$validated['target_key']}.",
            ...$this->serialize($learner),
            'launch' => [
                'target_key' => $launch['target_key'],
                'route' => $launch['route'],
                'learner_session' => [
                    'token' => $launch['token'],
                    ...$this->serializeLearnerSession($learner, $launch['expires_at']),
                ],
            ],
        ]);

        // Browser Page Portals deliberately store only the cookie-session
        // sentinel in web storage. Set the temporary portal token in the
        // server-managed HttpOnly cookie before the frontend navigates to the
        // learner route.
        return $response
            ->withCookie(cookie(
                LearnerSessionResolver::COOKIE_NAME,
                $launch['token'],
                0,
                '/',
                null,
                app()->environment('production'),
                true,
                false,
                'lax',
            ))
            ->withCookie(cookie(
                LearnerSessionResolver::MARKER_COOKIE_NAME,
                '1',
                0,
                '/',
                null,
                app()->environment('production'),
                false,
                false,
                'lax',
            ));
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
        $readingPath = $this->readingPaths->snapshot($learner, $progress);

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
                'speech_language' => SpeechLanguage::normalize($learner->speech_language),
                'is_active' => $learner->is_active,
                'analytics_excluded' => true,
                'progress_stage' => $progress->stage,
                'reading_path' => $readingPath,
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
                'available' => true,
                'reason' => 'The Learner Dashboard and all implemented workflow checkpoints are ready for persisted testing.',
                'targets' => LearnerPortalLaunchService::targets(),
            ],
        ];
    }

    private function serializeLearnerSession(Learner $learner, string $expiresAt): array
    {
        $progress = LearnerProgressState::query()->firstOrCreate(
            ['learner_id' => $learner->id],
            ['stage' => LearnerProgressState::BASELINE_STAGE],
        );

        return [
            'reading_path' => $this->readingPaths->snapshot($learner, $progress),
            'learner' => [
                'id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'full_name' => implode(' ', array_filter([
                    $learner->first_name,
                    $learner->middle_name,
                    $learner->last_name,
                    $learner->suffix,
                ])),
                'first_name' => $learner->first_name,
                'account_purpose' => $learner->account_purpose,
                'speech_language' => SpeechLanguage::normalize($learner->speech_language),
                'school' => $learner->school?->name,
                'grade_level' => $learner->grade_level,
                'section' => $learner->section,
                'progress' => [
                    'stage' => $progress->stage,
                    'current_required_lesson_order' => $progress->current_required_lesson_order,
                ],
                'achievement_keys' => LearnerAchievement::query()
                    ->where('learner_id', $learner->id)
                    ->orderBy('awarded_at')
                    ->pluck('achievement_key')
                    ->all(),
            ],
            'session' => ['expires_at' => $expiresAt],
        ];
    }
}
