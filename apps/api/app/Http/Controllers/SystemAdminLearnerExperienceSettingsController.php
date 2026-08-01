<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\LearnerLightweightModeSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class SystemAdminLearnerExperienceSettingsController extends Controller
{
    public function update(
        Request $request,
        LearnerLightweightModeSettings $settings,
    ): JsonResponse {
        /** @var StaffUser $systemAdministrator */
        $systemAdministrator = $request->user();
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'static_clara' => ['required', 'boolean'],
            'published_speech_only' => ['required', 'boolean'],
        ]);
        $current = DB::transaction(function () use (
            $settings,
            $validated,
            $systemAdministrator,
        ): array {
            $previous = $settings->contract();
            $current = $settings->update([
                'enabled' => (bool) $validated['enabled'],
                'static_clara' => (bool) $validated['static_clara'],
                'published_speech_only' => (bool) $validated['published_speech_only'],
            ]);

            if ($this->storedValues($previous) !== $this->storedValues($current)) {
                StaffAuditLog::query()->create([
                    'staff_user_id' => $systemAdministrator->id,
                    'action_key' => 'learner.lightweight_mode_updated',
                    'description' => $current['enabled']
                        ? 'Updated the lightweight learner experience.'
                        : 'Disabled the lightweight learner experience.',
                    'metadata' => [
                        'previous' => $this->storedValues($previous),
                        'current' => $this->storedValues($current),
                        'effective' => [
                            'display_mode' => $current['display_mode'],
                            'speech_mode' => $current['speech_mode'],
                        ],
                    ],
                ]);
            }

            return $current;
        });

        return response()->json(['lightweight_mode' => $current]);
    }

    /**
     * @param array{enabled: bool, static_clara: bool, published_speech_only: bool} $settings
     * @return array{enabled: bool, static_clara: bool, published_speech_only: bool}
     */
    private function storedValues(array $settings): array
    {
        return [
            'enabled' => $settings['enabled'],
            'static_clara' => $settings['static_clara'],
            'published_speech_only' => $settings['published_speech_only'],
        ];
    }
}
