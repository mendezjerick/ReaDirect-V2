<?php

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\SpeechProcessingSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SystemAdminSpeechSettingsController extends Controller
{
    public function update(
        Request $request,
        StaffUser $staffUser,
        SpeechProcessingSettings $settings,
    ): JsonResponse {
        $this->assertSystemAdministrator($staffUser);
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);
        $previousValue = $settings->conditionalMuNoiseReductionEnabled();
        $enabled = $settings->setConditionalMuNoiseReduction($validated['enabled']);

        if ($previousValue !== $enabled) {
            StaffAuditLog::query()->create([
                'staff_user_id' => $staffUser->id,
                'action_key' => 'speech.mu_noise_reduction_toggled',
                'description' => $enabled
                    ? 'Enabled conditional Mu noise reduction.'
                    : 'Disabled conditional Mu noise reduction.',
                'metadata' => [
                    'previous_enabled' => $previousValue,
                    'enabled' => $enabled,
                ],
            ]);
        }

        return response()->json([
            'speech_processing' => [
                'conditional_mu_noise_reduction_enabled' => $enabled,
                'default_mode' => 'raw_first',
            ],
        ]);
    }

    private function assertSystemAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'system_admin' || ! $staffUser->is_active) {
            abort(404);
        }
    }
}
