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

        $final = trim((string) $lessonResponse->final_transcript);
        $canonicalLetter = strtoupper($final);
        $isLetterLesson = $lessonResponse->run->lesson_key === 'required-lesson-1';
        if ($isLetterLesson && preg_match('/^[A-Z]$/', $canonicalLetter)) {
            $spoken = $this->letterPronunciation->spokenForm($canonicalLetter);
            $text = "You said {$spoken}.";
        } elseif ($lessonResponse->run->lesson_key === 'required-lesson-2'
            && $final !== ''
            && strtoupper($final) !== 'UNKNOWN') {
            $text = "You said {$final}.";
        } else {
            $text = $isLetterLesson
                ? 'I did not hear a clear letter. You can try the next one.'
                : 'I did not hear a clear word. You can try the next one.';
        }

        return $this->runtimeSpeech($text, 'result', [
            'X-ReaDirect-Letter' => $isLetterLesson
                && preg_match('/^[A-Z]$/', $canonicalLetter)
                    ? $canonicalLetter
                    : 'UNKNOWN',
            'X-ReaDirect-Word' => ! $isLetterLesson && $final !== ''
                ? $final
                : 'UNKNOWN',
        ]);
    }

    public function lessonDemonstration(
        Request $request,
        LessonResponse $lessonResponse,
    ): Response|JsonResponse {
        $session = $this->sessionResolver->resolve($request);
        $lessonResponse->loadMissing('run');
        abort_unless($lessonResponse->run->learner_id === $session->learner_id, 404);
        abort_unless(
            $lessonResponse->run->lesson_key === 'required-lesson-2',
            409,
            'Word demonstrations are available only in Lesson 2.',
        );
        abort_unless(
            $lessonResponse->teaching_state === 'DEMONSTRATING',
            409,
            'This lesson item does not need a demonstration.',
        );

        $item = collect(
            $lessonResponse->run->content_snapshot[$lessonResponse->mission_key] ?? [],
        )->first(
            fn (array $candidate): bool => ($candidate['content_id'] ?? null)
                === $lessonResponse->item_key,
        );
        abort_unless(is_array($item), 409, 'The lesson word is unavailable.');
        $word = trim((string) ($item['spoken_target'] ?? ''));
        abort_unless($word !== '', 409, 'The lesson word is unavailable.');

        return $this->runtimeSpeech(
            "The word is {$word}. Listen: {$word}. Now you try.",
            'instruction',
            ['X-ReaDirect-Word' => $word],
        );
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function runtimeSpeech(
        string $text,
        string $reference,
        array $headers = [],
    ): Response|JsonResponse {
        try {
            $speech = Http::accept('audio/wav')
                ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
                ->timeout((int) config('speech.tts_request_timeout_seconds'))
                ->post(rtrim((string) config('speech.tts_url'), '/').'/synthesize', [
                    'text' => $text,
                    'reference' => $reference,
                ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'message' => 'Ma\'am Clara is still preparing that feedback.',
            ], 503);
        }

        if (! $speech->successful()) {
            return response()->json([
                'message' => 'Ma\'am Clara could not prepare that feedback.',
            ], 503);
        }

        return response($speech->body(), 200, [
            'Content-Type' => 'audio/wav',
            'Cache-Control' => 'private, no-store',
            'X-ReaDirect-TTS-Source' => 'runtime-cache',
            ...$headers,
        ]);
    }
}
