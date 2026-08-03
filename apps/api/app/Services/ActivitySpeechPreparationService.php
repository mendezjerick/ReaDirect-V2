<?php

namespace App\Services;

use App\Models\LearnerSession;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Throwable;

final class ActivitySpeechPreparationService
{
    public function __construct(
        private readonly ActivitySpeechManifestService $manifestService,
    ) {}

    /**
     * @return array{
     *     activity: string,
     *     ready: bool,
     *     published_ready: bool,
     *     published_groups: list<string>,
     *     voice_version: string|null,
     *     unavailable_speech_keys: list<string>,
     *     runtime_required: bool,
     *     runtime_ready: bool,
     *     runtime_profiles: list<string>,
     *     profiles_ready: list<string>,
     *     device: string|null,
     *     message?: string
     * }
     */
    public function prepareForSession(
        LearnerSession $session,
        string $requestedActivity,
    ): array {
        $manifest = $this->manifestService->forSession(
            $session,
            $requestedActivity,
        );
        $published = $this->validatePublishedSpeech($manifest['published_speech_keys']);
        $base = [
            'activity' => $manifest['activity'],
            'published_groups' => $manifest['published_groups'],
            'published_ready' => $published['ready'],
            'voice_version' => $published['voice_version'],
            'unavailable_speech_keys' => $published['unavailable_speech_keys'],
            'runtime_required' => $manifest['requires_runtime'],
            'runtime_profiles' => $manifest['runtime_profiles'],
        ];

        if (! $published['ready']) {
            return [
                ...$base,
                'ready' => false,
                'runtime_ready' => false,
                'profiles_ready' => [],
                'device' => null,
                'message' => 'Ma\'am Clara\'s approved activity speech is unavailable. Please try again.',
            ];
        }

        if (! $manifest['requires_runtime']) {
            return [
                ...$base,
                'ready' => true,
                'runtime_ready' => true,
                'profiles_ready' => [],
                'device' => null,
            ];
        }

        $runtime = $this->prepareRuntimeProfiles($manifest['runtime_profiles']);

        return [
            ...$base,
            'ready' => $runtime['ready'],
            'runtime_ready' => $runtime['ready'],
            'profiles_ready' => $runtime['profiles_ready'],
            'device' => $runtime['device'],
            ...($runtime['ready'] ? [] : [
                'message' => 'Ma\'am Clara is still preparing her voice. Please try again.',
            ]),
        ];
    }

    /**
     * @param  list<string>  $speechKeys
     * @return array{
     *     ready: bool,
     *     voice_version: string|null,
     *     unavailable_speech_keys: list<string>
     * }
     */
    private function validatePublishedSpeech(array $speechKeys): array
    {
        $voice = TtsVoiceVersion::query()
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->first();

        if ($voice === null) {
            return [
                'ready' => false,
                'voice_version' => null,
                'unavailable_speech_keys' => $speechKeys,
            ];
        }

        $lines = TtsSpeechLine::query()
            ->where('tts_voice_version_id', $voice->id)
            ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
            ->whereIn('speech_key', $speechKeys)
            ->get()
            ->keyBy('speech_key');
        $unavailable = [];

        foreach ($speechKeys as $speechKey) {
            $line = $lines->get($speechKey);

            if ($line === null || ! $this->publishedAudioMatches($line)) {
                $unavailable[] = $speechKey;
            }
        }

        return [
            'ready' => $unavailable === [],
            'voice_version' => $voice->stable_key,
            'unavailable_speech_keys' => $unavailable,
        ];
    }

    private function publishedAudioMatches(TtsSpeechLine $line): bool
    {
        try {
            $disk = Storage::disk($line->audio_storage_disk);

            if (! $disk->exists($line->audio_storage_path)) {
                return false;
            }

            $audio = $disk->get($line->audio_storage_path);
        } catch (Throwable $error) {
            report($error);

            return false;
        }

        return hash_equals($line->audio_sha256, hash('sha256', $audio));
    }

    /**
     * @param  list<string>  $profiles
     * @return array{
     *     ready: bool,
     *     profiles_ready: list<string>,
     *     device: string|null
     * }
     */
    private function prepareRuntimeProfiles(array $profiles): array
    {
        try {
            $response = Http::acceptJson()
                ->withToken((string) config('speech.tts_token'))
                ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
                ->timeout((int) config('speech.tts_request_timeout_seconds'))
                ->post(rtrim((string) config('speech.tts_url'), '/').'/warmup', [
                    'profiles' => $profiles,
                ]);
        } catch (Throwable $error) {
            report($error);

            return [
                'ready' => false,
                'profiles_ready' => [],
                'device' => null,
            ];
        }

        $payload = $response->json();
        $profilesReady = is_array($payload)
            && isset($payload['profiles_ready'])
            && is_array($payload['profiles_ready'])
                ? array_values(array_filter(
                    $payload['profiles_ready'],
                    fn (mixed $profile): bool => is_string($profile),
                ))
                : [];
        $ready = $response->successful()
            && is_array($payload)
            && ($payload['ready'] ?? false) === true
            && array_diff($profiles, $profilesReady) === [];

        return [
            'ready' => $ready,
            'profiles_ready' => $profilesReady,
            'device' => is_array($payload) && is_string($payload['device'] ?? null)
                ? $payload['device']
                : null,
        ];
    }
}
