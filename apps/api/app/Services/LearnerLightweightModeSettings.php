<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\DB;

final class LearnerLightweightModeSettings
{
    public const KEY = 'learner.lightweight_mode';

    /**
     * @return array{enabled: bool, static_clara: bool, published_speech_only: bool}
     */
    public function stored(): array
    {
        $setting = SystemSetting::query()->where('key', self::KEY)->first();

        return $this->normalize($setting?->value ?? []);
    }

    /**
     * @return array{enabled: bool, static_clara: bool, published_speech_only: bool, display_mode: string, speech_mode: string, revision: string, applies_on_next_learner_load: bool}
     */
    public function contract(): array
    {
        $setting = SystemSetting::query()->where('key', self::KEY)->first();
        $stored = $this->normalize($setting?->value ?? []);

        return $this->contractFor($stored, $setting);
    }

    /**
     * @return array{revision: string, display_mode: string, speech_mode: string}
     */
    public function learnerContract(): array
    {
        $contract = $this->contract();

        return [
            'revision' => $contract['revision'],
            'display_mode' => $contract['display_mode'],
            'speech_mode' => $contract['speech_mode'],
        ];
    }

    /**
     * @param array{enabled: bool, static_clara: bool, published_speech_only: bool} $requested
     * @return array{enabled: bool, static_clara: bool, published_speech_only: bool, display_mode: string, speech_mode: string, revision: string, applies_on_next_learner_load: bool}
     */
    public function update(array $requested): array
    {
        $normalized = $this->normalize($requested);

        return DB::transaction(function () use ($normalized): array {
            $setting = SystemSetting::query()
                ->where('key', self::KEY)
                ->lockForUpdate()
                ->first();

            if ($setting === null) {
                $setting = SystemSetting::query()->create([
                    'key' => self::KEY,
                    'value' => $normalized,
                ]);
            } elseif ($this->normalize($setting->value ?? []) !== $normalized) {
                $setting->forceFill(['value' => $normalized])->save();
            }

            return $this->contractFor($normalized, $setting->fresh());
        });
    }

    /**
     * @param array<string, mixed> $value
     * @return array{enabled: bool, static_clara: bool, published_speech_only: bool}
     */
    private function normalize(array $value): array
    {
        $staticClara = (bool) ($value['static_clara'] ?? true);
        $publishedSpeechOnly = (bool) ($value['published_speech_only'] ?? true);
        $enabled = (bool) ($value['enabled'] ?? false);

        if (! $staticClara && ! $publishedSpeechOnly) {
            $enabled = false;
        }

        return [
            'enabled' => $enabled,
            'static_clara' => $staticClara,
            'published_speech_only' => $publishedSpeechOnly,
        ];
    }

    /**
     * @param array{enabled: bool, static_clara: bool, published_speech_only: bool} $stored
     * @return array{enabled: bool, static_clara: bool, published_speech_only: bool, display_mode: string, speech_mode: string, revision: string, applies_on_next_learner_load: bool}
     */
    private function contractFor(array $stored, ?SystemSetting $setting): array
    {
        return [
            ...$stored,
            'display_mode' => $stored['enabled'] && $stored['static_clara']
                ? 'static'
                : 'live2d',
            'speech_mode' => $stored['enabled'] && $stored['published_speech_only']
                ? 'published_only'
                : 'hybrid',
            'revision' => $setting === null
                ? 'default-v1'
                : "setting-{$setting->id}-{$setting->updated_at?->format('Uv')}",
            'applies_on_next_learner_load' => true,
        ];
    }
}
