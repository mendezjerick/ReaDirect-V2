<?php

namespace App\Http\Controllers;

use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\ActivitySpeechManifestService;
use App\Services\ActivitySpeechPreparationService;
use App\Services\IsolatedLetterPronunciation;
use App\Services\LearnerSessionResolver;
use App\Services\LearnerSpeechPolicy;
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
        private readonly LearnerSpeechPolicy $speechPolicy,
    ) {}

    public function activityManifest(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $activity = $request->validate([
            'activity' => ['required', 'string', 'max:80'],
        ])['activity'];

        try {
            $manifest = $this->activitySpeechManifest->forSession(
                $session,
                $activity,
            );
        } catch (DomainException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        return response()->json($manifest);
    }

    public function activityReadiness(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $activity = $request->validate([
            'activity' => ['required', 'string', 'max:80'],
        ])['activity'];

        try {
            $readiness = $this->activitySpeechPreparation->prepareForSession(
                $session,
                $activity,
            );
        } catch (DomainException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        return response()->json($readiness, $readiness['ready'] ? 200 : 503);
    }

    public function speech(Request $request, string $speechKey): Response|JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);

        return $this->publishedSpeech($session, $speechKey);
    }

    private function publishedSpeech(
        LearnerSession $session,
        string $speechKey,
        string $source = 'published',
        array $headers = [],
    ): Response|JsonResponse {
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
            'X-ReaDirect-TTS-Source' => $source,
            'X-ReaDirect-TTS-Voice' => $speech->voiceVersion->stable_key,
            ...$headers,
        ]);
    }

    public function lessonFeedback(Request $request, LessonResponse $lessonResponse): Response|JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $lessonResponse->loadMissing('run');
        abort_unless($lessonResponse->run->learner_id === $session->learner_id, 404);
        abort_unless($lessonResponse->response_type === 'speech', 409, 'Skipped items do not have spoken feedback.');
        abort_unless(
            $this->speechPolicy->allowsRuntimeFeedback($lessonResponse),
            409,
            'Response-specific feedback is unavailable while published-only speech is effective.',
        );
        $fallbackSpeechKey = $this->speechPolicy->firstIncorrectSpeechKey($lessonResponse);
        abort_unless($fallbackSpeechKey !== null, 409, 'This lesson does not support response-specific feedback.');

        $final = trim((string) $lessonResponse->final_transcript);
        $canonicalLetter = strtoupper($final);
        $isLetterLesson = $lessonResponse->run->lesson_key === 'required-lesson-1';
        $isWordLesson = $lessonResponse->run->lesson_key === 'required-lesson-2';
        $isPhraseLesson = $lessonResponse->run->lesson_key === 'required-lesson-3';
        $isSentenceLesson = $lessonResponse->run->lesson_key === 'required-lesson-4';
        $isAlignedTextLesson = $isPhraseLesson || $isSentenceLesson;
        $alignmentDiagnosis = (string) data_get(
            $lessonResponse->evidence,
            'transcript_alignment.diagnosis_key',
            '',
        );
        if (
            $isAlignedTextLesson
            && $lessonResponse->decision !== 'CORRECT'
            && $alignmentDiagnosis !== ''
        ) {
            $text = $this->alignedTextCorrection(
                (array) data_get(
                    $lessonResponse->evidence,
                    'transcript_alignment',
                    [],
                ),
                $isSentenceLesson ? 'sentence' : 'phrase',
            );
        } elseif ($isLetterLesson && preg_match('/^[A-Z]$/', $canonicalLetter)) {
            $spoken = $this->letterPronunciation->spokenForm($canonicalLetter);
            $text = "You said {$spoken}.";
        } elseif (($isWordLesson || $isAlignedTextLesson)
            && $final !== ''
            && strtoupper($final) !== 'UNKNOWN') {
            $text = "You said {$final}.";
        } else {
            $text = match (true) {
                $isLetterLesson => 'I did not hear a clear letter. You can try the next one.',
                $isPhraseLesson => 'I did not hear a clear phrase. You can try the next one.',
                $isSentenceLesson => 'I did not hear a clear sentence. You can try the next one.',
                default => 'I did not hear a clear word. You can try the next one.',
            };
        }

        return $this->runtimeSpeech($session, $text, 'result', $fallbackSpeechKey, [
            'X-ReaDirect-Letter' => $isLetterLesson
                && preg_match('/^[A-Z]$/', $canonicalLetter)
                    ? $canonicalLetter
                    : 'UNKNOWN',
            'X-ReaDirect-Word' => $isWordLesson && $final !== ''
                ? $final
                : 'UNKNOWN',
            'X-ReaDirect-Phrase' => $isPhraseLesson && $final !== ''
                ? $final
                : 'UNKNOWN',
            'X-ReaDirect-Phrase-Diagnosis' => $isPhraseLesson
                && $alignmentDiagnosis !== ''
                    ? $alignmentDiagnosis
                    : 'NONE',
            'X-ReaDirect-Sentence' => $isSentenceLesson && $final !== ''
                ? $final
                : 'UNKNOWN',
            'X-ReaDirect-Sentence-Diagnosis' => $isSentenceLesson
                && $alignmentDiagnosis !== ''
                    ? $alignmentDiagnosis
                    : 'NONE',
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
        abort_unless(
            $this->speechPolicy->allowsRuntimeDemonstration($lessonResponse),
            409,
            'Word demonstrations are unavailable while published-only speech is effective.',
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
            $session,
            "The word is {$word}. Listen: {$word}. Now you try.",
            'instruction',
            'lesson-2-word-demo-'.str_replace('lesson-v1-word-', '', (string) $item['content_id']),
            ['X-ReaDirect-Word' => $word],
        );
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function runtimeSpeech(
        LearnerSession $session,
        string $text,
        string $reference,
        string $fallbackSpeechKey,
        array $headers = [],
    ): Response|JsonResponse {
        try {
            $speech = Http::accept('audio/wav')
                ->withToken((string) config('speech.tts_token'))
                ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
                ->timeout((int) config('speech.tts_request_timeout_seconds'))
                ->post(rtrim((string) config('speech.tts_url'), '/').'/synthesize', [
                    'text' => $text,
                    'reference' => $reference,
                ]);
        } catch (Throwable $error) {
            report($error);

            return $this->publishedSpeech(
                $session,
                $fallbackSpeechKey,
                'published-fallback',
                ['X-ReaDirect-TTS-Fallback' => 'runtime-unavailable', ...$headers],
            );
        }

        if (! $speech->successful()) {
            return $this->publishedSpeech(
                $session,
                $fallbackSpeechKey,
                'published-fallback',
                ['X-ReaDirect-TTS-Fallback' => 'runtime-unavailable', ...$headers],
            );
        }

        return response($speech->body(), 200, [
            'Content-Type' => 'audio/wav',
            'Cache-Control' => 'private, no-store',
            'X-ReaDirect-TTS-Source' => 'runtime-cache',
            ...$headers,
        ]);
    }

    /** @param array<string, mixed> $alignment */
    private function alignedTextCorrection(
        array $alignment,
        string $unit,
    ): string {
        $diagnosis = (string) ($alignment['diagnosis_key'] ?? '');
        $operation = (array) ($alignment['primary_operation'] ?? []);
        $expected = trim((string) ($operation['expected'] ?? ''));
        $actual = trim((string) ($operation['actual'] ?? ''));

        return match ($diagnosis) {
            'missing_word' => $expected !== ''
                ? "You missed the word {$expected}."
                : "You missed one word. Let us try the {$unit} again.",
            'extra_word' => $actual !== ''
                ? "I heard an extra word, {$actual}."
                : "I heard one extra word. Let us try the {$unit} again.",
            'replaced_word' => $expected !== '' && $actual !== ''
                ? "I heard {$actual} instead of {$expected}."
                : "One word was different. Let us try the {$unit} again.",
            'words_out_of_order' => $this->wordOrderCorrection($operation),
            'multiple_word_differences' => $this->multipleDifferenceCorrection(
                $operation,
            ),
            default => "Some words were different. Let us read the {$unit} one word at a time.",
        };
    }

    /** @param array<string, mixed> $operation */
    private function wordOrderCorrection(array $operation): string
    {
        $first = trim((string) ($operation['expected_first'] ?? ''));
        $second = trim((string) ($operation['expected_second'] ?? ''));

        return $first !== '' && $second !== ''
            ? "The words {$first} and {$second} changed places."
            : 'Two words changed places. Let us try the phrase again.';
    }

    /** @param array<string, mixed> $operation */
    private function multipleDifferenceCorrection(array $operation): string
    {
        $expected = trim((string) ($operation['expected'] ?? ''));
        $actual = trim((string) ($operation['actual'] ?? ''));

        return match ($operation['type'] ?? '') {
            'delete' => $expected !== ''
                ? "Let us fix one part. You missed the word {$expected}."
                : 'Let us fix one part. One word was missing.',
            'insert' => $actual !== ''
                ? "Let us fix one part. I heard an extra word, {$actual}."
                : 'Let us fix one part. I heard an extra word.',
            'substitute' => $expected !== '' && $actual !== ''
                ? "Let us fix one part. I heard {$actual} instead of {$expected}."
                : 'Let us fix one part. One word was different.',
            default => 'Some words were different. Let us read the phrase one word at a time.',
        };
    }
}
