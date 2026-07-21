<?php

namespace App\Services;

use App\Models\SystemSetting;

final class SpeechProcessingSettings
{
    public const CONDITIONAL_MU_NOISE_REDUCTION_KEY = 'speech.mu_conditional_noise_reduction';

    public function conditionalMuNoiseReductionEnabled(): bool
    {
        $setting = SystemSetting::query()
            ->where('key', self::CONDITIONAL_MU_NOISE_REDUCTION_KEY)
            ->first();

        return (bool) ($setting?->value['enabled'] ?? false);
    }

    public function setConditionalMuNoiseReduction(bool $enabled): bool
    {
        SystemSetting::query()->updateOrCreate(
            ['key' => self::CONDITIONAL_MU_NOISE_REDUCTION_KEY],
            ['value' => ['enabled' => $enabled]],
        );

        return $enabled;
    }
}
