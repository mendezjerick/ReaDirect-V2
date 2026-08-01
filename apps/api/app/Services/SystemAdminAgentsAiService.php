<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Support\Collection;

final class SystemAdminAgentsAiService
{
    public function settings(
        SpeechProcessingSettings $speechSettings,
        LearnerLightweightModeSettings $lightweightMode,
    ): array
    {
        $voice = $this->publishedVoice();
        $lineCounts = $voice === null
            ? collect()
            : TtsSpeechLine::query()
                ->where('tts_voice_version_id', $voice->id)
                ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
                ->selectRaw('reference_role, COUNT(*) as aggregate')
                ->groupBy('reference_role')
                ->orderBy('reference_role')
                ->pluck('aggregate', 'reference_role');

        return [
            'agent' => [
                'name' => "Ma'am Clara",
                'role' => 'Reading teacher and learner guide',
                'display' => [
                    'mode' => 'Live2D',
                    'fallback' => 'Approved static Clara render',
                    'ownership' => 'Source controlled',
                ],
                'typography' => [
                    'learner_interface' => 'Jersey 20',
                    'authored_reading_content' => 'Lexend',
                    'ownership' => 'Design-system controlled',
                ],
                'voice' => [
                    'stable_key' => $voice?->stable_key,
                    'engine' => $voice?->engine,
                    'reference_set' => $voice?->reference_set,
                    'conditioning_version' => $voice?->conditioning_version,
                    'status' => $voice?->status ?? 'unpublished',
                    'published_lines' => (int) $lineCounts->sum(),
                    'reference_roles' => $lineCounts
                        ->map(fn (mixed $count, string $role): array => [
                            'role' => $role,
                            'published_lines' => (int) $count,
                        ])
                        ->values()
                        ->all(),
                ],
                'speech_processing' => [
                    'mu_default_mode' => 'raw_first',
                    'conditional_mu_noise_reduction_enabled' => $speechSettings
                        ->conditionalMuNoiseReductionEnabled(),
                    'nu_noise_reduction' => false,
                ],
                'lightweight_mode' => $lightweightMode->contract(),
            ],
            'governance' => [
                'read_only' => true,
                'message' => 'Display, typography, and voice publication remain source-controlled contracts. The lightweight learner experience is runtime configurable and applies on the next learner load.',
                'lightweight_mode_mutable' => true,
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function promptTemplates(): array
    {
        $voice = $this->publishedVoice();
        $templates = $voice === null
            ? collect()
            : TtsSpeechLine::query()
                ->where('tts_voice_version_id', $voice->id)
                ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
                ->orderBy('speech_key')
                ->get(['speech_key', 'text', 'reference_role', 'status'])
                ->map(fn (TtsSpeechLine $line): array => [
                    'speech_key' => $line->speech_key,
                    'text' => $line->text,
                    'reference_role' => $line->reference_role,
                    'group' => $this->templateGroup($line->speech_key),
                    'status' => $line->status,
                ]);

        return [
            'summary' => [
                'published_voice' => $voice?->stable_key,
                'published_templates' => $templates->count(),
                'groups' => $templates
                    ->groupBy('group')
                    ->map(fn (Collection $lines, string $group): array => [
                        'group' => $group,
                        'published_templates' => $lines->count(),
                    ])
                    ->values()
                    ->all(),
                'generative_prompt_registry_configured' => false,
            ],
            'templates' => $templates->values()->all(),
            'governance' => [
                'read_only' => true,
                'message' => 'These are approved fixed Clara speech templates, not editable LLM prompts. Changes require reviewed source and a newly published voice catalog.',
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function publishedVoice(): ?TtsVoiceVersion
    {
        return TtsVoiceVersion::query()
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->latest('published_at')
            ->latest('id')
            ->first();
    }

    private function templateGroup(string $speechKey): string
    {
        return match (true) {
            str_starts_with($speechKey, 'assessment-') => 'Assessments',
            str_starts_with($speechKey, 'lesson-') => 'Required lessons',
            str_starts_with($speechKey, 'learn-with-clara-') => 'Learn with Clara',
            default => 'Shared learner flow',
        };
    }
}
