<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\School;
use App\Models\SpeechSandboxAttempt;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

final class SystemAdminOverviewService
{
    /** @var list<string> */
    private const PART_ONE_LEVELS = [
        'Full Refresher',
        'Moderate Refresher',
        'Light Refresher',
        'Grade Ready',
    ];

    /** @var list<string> */
    private const READING_PROFILES = [
        'Low Emerging Reader',
        'High Emerging Reader',
        'Developing Reader',
        'Transitioning Reader',
        'Reading at Grade Level',
    ];

    /** @return array<string, mixed> */
    public function build(SpeechProcessingSettings $speechSettings): array
    {
        DB::select('select 1');

        $publishedVoice = TtsVoiceVersion::query()
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->latest('published_at')
            ->latest('id')
            ->first();
        $publishedSpeechCount = $publishedVoice === null
            ? 0
            : TtsSpeechLine::query()
                ->where('tts_voice_version_id', $publishedVoice->id)
                ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
                ->count();

        return [
            'metrics' => [
                'total_schools' => School::query()->count(),
                'total_teachers' => StaffUser::query()
                    ->where('role', 'teacher')
                    ->count(),
                'total_learners' => Learner::query()
                    ->where('account_purpose', Learner::PURPOSE_STANDARD)
                    ->count(),
                'sandbox_attempts' => SpeechSandboxAttempt::query()->count(),
            ],
            'part_one_distribution' => $this->distribution(
                self::PART_ONE_LEVELS,
                $this->latestStandardRunValues(
                    AssessmentRun::TYPE_DIAGNOSTIC,
                    'part_one_level',
                ),
            ),
            'reading_profile_distribution' => $this->distribution(
                self::READING_PROFILES,
                $this->latestStandardRunValues(
                    AssessmentRun::TYPE_FINAL,
                    'final_reading_profile',
                    AssessmentRun::STATUS_COMPLETED,
                ),
            ),
            'system_health' => $this->systemHealth(
                $publishedVoice?->stable_key,
                $publishedSpeechCount,
            ),
            'speech_processing' => [
                'conditional_mu_noise_reduction_enabled' => $speechSettings
                    ->conditionalMuNoiseReductionEnabled(),
                'default_mode' => 'raw_first',
            ],
            'recent_assessment_activity' => $this->recentAssessmentActivity(),
            'recent_speech_failures' => $this->recentSpeechFailures(),
            'recent_actions' => $this->recentActions(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param  list<string>  $labels
     * @param  Collection<int, mixed>  $values
     * @return list<array{label: string, value: int}>
     */
    private function distribution(array $labels, Collection $values): array
    {
        $counts = $values
            ->filter(fn (mixed $value): bool => is_string($value))
            ->countBy();

        return collect($labels)
            ->map(fn (string $label): array => [
                'label' => $label,
                'value' => (int) $counts->get($label, 0),
            ])
            ->all();
    }

    /**
     * @return Collection<int, mixed>
     */
    private function latestStandardRunValues(
        string $assessmentType,
        string $field,
        ?string $status = null,
    ): Collection {
        $latestRunIds = AssessmentRun::query()
            ->selectRaw('MAX(assessment_runs.id)')
            ->join('learners', 'learners.id', '=', 'assessment_runs.learner_id')
            ->where('learners.account_purpose', Learner::PURPOSE_STANDARD)
            ->where('assessment_runs.assessment_type', $assessmentType)
            ->whereNotNull("assessment_runs.{$field}")
            ->when(
                $status !== null,
                fn ($query) => $query->where(
                    'assessment_runs.status',
                    $status,
                ),
            )
            ->groupBy('assessment_runs.learner_id');

        return AssessmentRun::query()
            ->whereIn('id', $latestRunIds)
            ->pluck($field);
    }

    /** @return list<array<string, mixed>> */
    private function recentAssessmentActivity(): array
    {
        return AssessmentRun::query()
            ->with('learner.school:id,name')
            ->whereHas(
                'learner',
                fn ($query) => $query->where(
                    'account_purpose',
                    Learner::PURPOSE_STANDARD,
                ),
            )
            ->orderByRaw('COALESCE(assessment_completed_at, updated_at) DESC')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(function (AssessmentRun $run): array {
                $learner = $run->learner;
                $occurredAt = $run->assessment_completed_at ?? $run->updated_at;

                return [
                    'id' => $run->id,
                    'learner_id' => $run->learner_id,
                    'learner_code' => $learner?->learner_code ?? '',
                    'learner_name' => $learner === null
                        ? ''
                        : $this->fullName($learner),
                    'school_name' => $learner?->school?->name,
                    'assessment_type' => $run->assessment_type,
                    'assessment_label' => $run->assessment_type
                        === AssessmentRun::TYPE_FINAL
                        ? 'Final Assessment'
                        : 'Diagnostic Assessment',
                    'status' => $run->status,
                    'score' => $run->final_reading_score ?? $run->part_one_score,
                    'profile' => $run->final_reading_profile ?? $run->part_one_level,
                    'occurred_at' => $occurredAt?->toIso8601String(),
                ];
            })
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function recentSpeechFailures(): array
    {
        return SpeechSandboxAttempt::query()
            ->where(function ($query): void {
                $query
                    ->whereNotNull('error_message')
                    ->orWhere('service_status', '>=', 400);
            })
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (SpeechSandboxAttempt $attempt): array => [
                'id' => $attempt->id,
                'source' => $attempt->mode === SpeechSandboxAttempt::MODE_LETTER
                    ? 'IsoLetter Sandbox'
                    : 'True Sandbox',
                'mode' => $attempt->mode,
                'status_code' => $attempt->service_status,
                'summary' => $attempt->service_status === null
                    ? 'The ASR service could not be reached.'
                    : "The ASR service returned HTTP {$attempt->service_status}.",
                'occurred_at' => $attempt->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /** @return list<array<string, mixed>> */
    private function recentActions(): array
    {
        return StaffAuditLog::query()
            ->with('staffUser:id,display_name,username')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (StaffAuditLog $auditLog): array => [
                'id' => $auditLog->id,
                'description' => $auditLog->description,
                'actor' => $auditLog->staffUser?->display_name
                    ?? $auditLog->staffUser?->username
                    ?? 'System',
                'occurred_at' => $auditLog->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return list<array{
     *     service: string,
     *     status: 'online'|'degraded'|'offline'|'not_configured',
     *     detail: string
     * }>
     */
    private function systemHealth(
        ?string $publishedVoiceKey,
        int $publishedSpeechCount,
    ): array {
        $queueConnection = config('queue.default');
        $environment = (string) config('app.env', 'unknown');

        return [
            [
                'service' => 'API',
                'status' => 'online',
                'detail' => 'Laravel responded to this authenticated health request.',
            ],
            [
                'service' => 'Database',
                'status' => 'online',
                'detail' => 'The application database accepted a live query.',
            ],
            $this->asrHealth(),
            $this->ttsHealth(
                $publishedVoiceKey,
                $publishedSpeechCount,
            ),
            [
                'service' => 'Queue',
                'status' => is_string($queueConnection)
                    ? 'online'
                    : 'not_configured',
                'detail' => is_string($queueConnection)
                    ? "The {$queueConnection} queue connection is configured."
                    : 'No Laravel queue connection is configured.',
            ],
            [
                'service' => 'Environment',
                'status' => 'online',
                'detail' => "Laravel is running in the {$environment} environment.",
            ],
        ];
    }

    /**
     * @return array{
     *     service: string,
     *     status: 'online'|'degraded'|'offline',
     *     detail: string
     * }
     */
    private function asrHealth(): array
    {
        try {
            $response = $this->healthClient()->get(
                rtrim((string) config('speech.asr_url'), '/').'/ready',
            );
            $payload = $response->json();
            $ready = $response->successful()
                && is_array($payload)
                && ($payload['status'] ?? null) === 'ready';

            return [
                'service' => 'ASR',
                'status' => $ready ? 'online' : 'degraded',
                'detail' => $ready
                    ? 'Mu transcription and Nu letter resolution are ready.'
                    : 'The ASR service responded, but its model is not ready.',
            ];
        } catch (Throwable) {
            return [
                'service' => 'ASR',
                'status' => 'offline',
                'detail' => 'The ASR service did not answer its readiness check.',
            ];
        }
    }

    /**
     * @return array{
     *     service: string,
     *     status: 'online'|'degraded'|'offline',
     *     detail: string
     * }
     */
    private function ttsHealth(
        ?string $publishedVoiceKey,
        int $publishedSpeechCount,
    ): array {
        $catalogDetail = $publishedVoiceKey === null
            ? 'No published Clara voice catalog is available.'
            : "{$publishedSpeechCount} published lines are available from {$publishedVoiceKey}.";

        try {
            $response = $this->healthClient()->get(
                rtrim((string) config('speech.tts_url'), '/').'/health',
            );
            $payload = $response->json();
            $runtimeReady = $response->successful()
                && is_array($payload)
                && ($payload['runtime_ready'] ?? false) === true;

            return [
                'service' => 'TTS',
                'status' => $runtimeReady && $publishedVoiceKey !== null
                    ? 'online'
                    : 'degraded',
                'detail' => $runtimeReady
                    ? "{$catalogDetail} Runtime voice generation is ready."
                    : "{$catalogDetail} Runtime voice generation is warming or unavailable.",
            ];
        } catch (Throwable) {
            return [
                'service' => 'TTS',
                'status' => 'offline',
                'detail' => "{$catalogDetail} The runtime voice service did not answer.",
            ];
        }
    }

    private function healthClient(): PendingRequest
    {
        return Http::acceptJson()
            ->connectTimeout(1)
            ->timeout(2);
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
