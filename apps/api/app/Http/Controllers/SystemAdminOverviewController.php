<?php

namespace App\Http\Controllers;

use App\Models\Learner;
use App\Models\School;
use App\Models\SpeechSandboxAttempt;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\SpeechProcessingSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class SystemAdminOverviewController extends Controller
{
    public function show(SpeechProcessingSettings $speechSettings): JsonResponse
    {
        DB::select('select 1');

        $recentActions = StaffAuditLog::query()
            ->with('staffUser:id,display_name,username')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (StaffAuditLog $auditLog): array => [
                'id' => $auditLog->id,
                'description' => $auditLog->description,
                'actor' => $auditLog->staffUser?->display_name ?? $auditLog->staffUser?->username ?? 'System',
                'occurred_at' => $auditLog->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'metrics' => [
                'total_schools' => School::query()->count(),
                'total_teachers' => StaffUser::query()->where('role', 'teacher')->count(),
                'total_learners' => Learner::query()
                    ->where('account_purpose', Learner::PURPOSE_STANDARD)
                    ->count(),
                'sandbox_attempts' => SpeechSandboxAttempt::query()->count(),
            ],
            'part_one_distribution' => [
                ['label' => 'Full Refresher', 'value' => 0],
                ['label' => 'Moderate Refresher', 'value' => 0],
                ['label' => 'Light Refresher', 'value' => 0],
                ['label' => 'Grade Ready', 'value' => 0],
            ],
            'reading_profile_distribution' => [
                ['label' => 'Low Emerging Reader', 'value' => 0],
                ['label' => 'High Emerging Reader', 'value' => 0],
                ['label' => 'Developing Reader', 'value' => 0],
                ['label' => 'Transitioning Reader', 'value' => 0],
                ['label' => 'Reading at Grade Level', 'value' => 0],
            ],
            'system_health' => [
                ['service' => 'API', 'status' => 'online', 'detail' => 'Laravel development API is responding.'],
                ['service' => 'Database', 'status' => 'online', 'detail' => 'PostgreSQL connection is healthy.'],
                ['service' => 'ASR', 'status' => 'online', 'detail' => 'Mu powers general transcription and Nu isolated-letter resolution.'],
                ['service' => 'TTS', 'status' => 'not_configured', 'detail' => 'Voice generation will be connected later.'],
            ],
            'speech_processing' => [
                'conditional_mu_noise_reduction_enabled' => $speechSettings->conditionalMuNoiseReductionEnabled(),
                'default_mode' => 'raw_first',
            ],
            'recent_assessment_activity' => [],
            'recent_actions' => $recentActions,
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}
