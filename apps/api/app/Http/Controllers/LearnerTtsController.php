<?php

namespace App\Http\Controllers;

use App\Models\LessonResponse;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\ActivitySpeechManifestService;
use App\Services\ActivitySpeechPreparationService;
use App\Services\IsolatedLetterPronunciation;
use App\Services\LearnerSessionResolver;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Throwable;

final class LearnerTtsController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
        private readonly IsolatedLetterPronunciation $letterPronunciation,
        private readonly ActivitySpeechManifestService $activitySpeechManifest,
        private readonly ActivitySpeechPreparationService $activitySpeechPreparation,
    ) {}

    public function activityManifest(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);

        try {
            $manifest = $this->activitySpeechManifest->forSession($session);
        } catch (DomainException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        return response()->json($manifest);
    }

    public function activityReadiness(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);

        try {
            $readiness = $this->activitySpeechPreparation->prepareForSession($session);
        } catch (DomainException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        return response()->json($readiness, $readiness['ready'] ? 200 : 503);
    }

    public function speech(Request $request, string $speechKey): Response|JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $speech = TtsSpeechLine::query()
            ->with('voiceVersion')
            ->where('speech_key', $speechKey)
            ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
            ->whereHas('voiceVersion', fn ($query) => $query
                ->where('status', TtsVoiceVersion::STATUS_PUBLISHED))
            ->orderByDesc('approved_at')
            ->first();

        if ($speech === null) {
            abort(404, 'That Clara speech line is not available.');
        }

        try {
            $disk = Storage::disk($speech->audio_storage_disk);
            $audio = $disk->exists($speech->audio_storage_path)
                ? $disk->get($speech->audio_storage_path)
                : null;
        } catch (Throwable $error) {
            report($error);
            $audio = null;
        }

        if (! is_string($audio)
            || ! hash_equals($speech->audio_sha256, hash('sha256', $audio))) {
            return response()->json([
                'message' => 'Ma\'am Clara\'s approved voice line is unavailable. Please try again.',
            ], 503);
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        return response($audio, 200, [
            'Content-Type' => 'audio/wav',
            'Cache-Control' => 'no-store',
            'X-ReaDirect-Clara-Speech' => $speechKey,
            'X-ReaDirect-TTS-Source' => 'published',
            'X-ReaDirect-TTS-Voice' => $speech->voiceVersion->stable_key,
        ]);
    }

    public function lessonFeedback(Request $request, LessonResponse $lessonResponse): Response|JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $lessonResponse->loadMissing('run');
        abort_unless($lessonResponse->run->learner_id === $session->learner_id, 404);
        abort_unless($lessonResponse->response_type === 'speech', 409, 'Skipped items do not have spoken feedback.');

        $canonical = strtoupper(trim((string) $lessonResponse->final_transcript));
        $spoken = $this->letterPronunciation->spokenForm($canonical);
        $text = preg_match('/^[A-Z]$/', $canonical)
            ? "You said {$spoken}."
            : 'I did not hear a clear letter. You can try the next one.';

        try {
            $speech = Http::accept('audio/wav')
                ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
                ->timeout((int) config('speech.tts_request_timeout_seconds'))
                ->post(rtrim((string) config('speech.tts_url'), '/').'/synthesize', [
                    'text' => $text,
                    'reference' => 'result',
                ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json(['message' => 'Ma\'am Clara is still preparing that feedback.'], 503);
        }

        if (! $speech->successful()) {
            return response()->json(['message' => 'Ma\'am Clara could not prepare that feedback.'], 503);
        }

        return response($speech->body(), 200, [
            'Content-Type' => 'audio/wav',
            'Cache-Control' => 'private, no-store',
            'X-ReaDirect-TTS-Source' => 'runtime-cache',
            'X-ReaDirect-Letter' => preg_match('/^[A-Z]$/', $canonical) ? $canonical : 'UNKNOWN',
        ]);
    }
}
