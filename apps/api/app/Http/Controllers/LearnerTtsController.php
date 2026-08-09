<?php

namespace App\Http\Controllers;

use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\TtsSpeechLine;
use App\Services\ActivitySpeechManifestService;
use App\Services\ActivitySpeechPreparationService;
use App\Services\IsolatedLetterPronunciation;
use App\Services\LearnerSessionResolver;
use App\Services\LearnerSpeechPolicy;
use App\Services\PublishedTtsVoiceResolver;
use App\Services\RuntimeSpeechTemplateRenderer;
use App\Support\SpeechLanguage;
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
        private readonly PublishedTtsVoiceResolver $publishedVoices,
        private readonly RuntimeSpeechTemplateRenderer $runtimeTemplates,
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
        $language = SpeechLanguage::normalize($session->learner->speech_language);
        $voice = $this->publishedVoices->forLanguage($language);
        if ($voice === null) {
            abort(404, 'That Clara speech language is not available.');
        }

        $speech = TtsSpeechLine::query()
            ->where('tts_voice_version_id', $voice->id)
            ->where('speech_key', $speechKey)
            ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
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
            'X-ReaDirect-TTS-Voice' => $voice->stable_key,
            'X-ReaDirect-TTS-Language' => $language,
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
        $language = SpeechLanguage::normalize($session->learner->speech_language);
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
                $language,
            );
        } elseif ($isLetterLesson && preg_match('/^[A-Z]$/', $canonicalLetter)) {
            $spoken = $this->letterPronunciation->spokenForm($canonicalLetter);
            $text = $this->runtimeTemplates->render(
                $language,
                'feedback.you_said_letter',
                ['spoken' => $spoken],
            );
        } elseif (($isWordLesson || $isAlignedTextLesson)
            && $final !== ''
            && strtoupper($final) !== 'UNKNOWN') {
            $text = $this->runtimeTemplates->render(
                $language,
                'feedback.you_said_transcript',
                ['final' => $final],
            );
        } else {
            $templateKey = match (true) {
                $isLetterLesson => 'feedback.unclear_letter',
                $isPhraseLesson => 'feedback.unclear_phrase',
                $isSentenceLesson => 'feedback.unclear_sentence',
                default => 'feedback.unclear_word',
            };
            $text = $this->runtimeTemplates->render($language, $templateKey);
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
            $this->runtimeTemplates->render(
                SpeechLanguage::normalize($session->learner->speech_language),
                'demonstration.lesson_2_word',
                ['word' => $word],
            ),
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
        $language = SpeechLanguage::normalize($session->learner->speech_language);

        try {
            $speech = Http::accept('audio/wav')
                ->withToken((string) config('speech.tts_token'))
                ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
                ->timeout((int) config('speech.tts_request_timeout_seconds'))
                ->post(rtrim((string) config('speech.tts_url'), '/').'/synthesize', [
                    'text' => $text,
                    'reference' => $reference,
                    'language' => $language,
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

        $reportedLanguage = $speech->header('X-ReaDirect-TTS-Language');
        $reportedLanguage = is_string($reportedLanguage) && $reportedLanguage !== ''
            ? SpeechLanguage::normalize($reportedLanguage)
            : SpeechLanguage::ENGLISH;

        if (! $speech->successful() || $reportedLanguage !== $language) {
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
            'X-ReaDirect-TTS-Language' => $language,
            ...$headers,
        ]);
    }

    /** @param array<string, mixed> $alignment */
    private function alignedTextCorrection(
        array $alignment,
        string $unit,
        string $language,
    ): string {
        $diagnosis = (string) ($alignment['diagnosis_key'] ?? '');
        $operation = (array) ($alignment['primary_operation'] ?? []);
        $expected = trim((string) ($operation['expected'] ?? ''));
        $actual = trim((string) ($operation['actual'] ?? ''));

        return match ($diagnosis) {
            'missing_word' => $expected !== ''
                ? $this->runtimeTemplates->render(
                    $language,
                    'alignment.missing_word',
                    ['expected' => $expected],
                )
                : $this->runtimeTemplates->render(
                    $language,
                    'alignment.missing_word_fallback',
                    ['unit' => $unit],
                ),
            'extra_word' => $actual !== ''
                ? $this->runtimeTemplates->render(
                    $language,
                    'alignment.extra_word',
                    ['actual' => $actual],
                )
                : $this->runtimeTemplates->render(
                    $language,
                    'alignment.extra_word_fallback',
                    ['unit' => $unit],
                ),
            'replaced_word' => $expected !== '' && $actual !== ''
                ? $this->runtimeTemplates->render(
                    $language,
                    'alignment.replaced_word',
                    ['actual' => $actual, 'expected' => $expected],
                )
                : $this->runtimeTemplates->render(
                    $language,
                    'alignment.replaced_word_fallback',
                    ['unit' => $unit],
                ),
            'words_out_of_order' => $this->wordOrderCorrection($operation, $language),
            'multiple_word_differences' => $this->multipleDifferenceCorrection(
                $operation,
                $language,
            ),
            default => $this->runtimeTemplates->render(
                $language,
                'alignment.default',
                ['unit' => $unit],
            ),
        };
    }

    /** @param array<string, mixed> $operation */
    private function wordOrderCorrection(array $operation, string $language): string
    {
        $first = trim((string) ($operation['expected_first'] ?? ''));
        $second = trim((string) ($operation['expected_second'] ?? ''));

        return $first !== '' && $second !== ''
            ? $this->runtimeTemplates->render(
                $language,
                'alignment.words_out_of_order',
                ['first' => $first, 'second' => $second],
            )
            : $this->runtimeTemplates->render(
                $language,
                'alignment.words_out_of_order_fallback',
            );
    }

    /** @param array<string, mixed> $operation */
    private function multipleDifferenceCorrection(array $operation, string $language): string
    {
        $expected = trim((string) ($operation['expected'] ?? ''));
        $actual = trim((string) ($operation['actual'] ?? ''));

        return match ($operation['type'] ?? '') {
            'delete' => $expected !== ''
                ? $this->runtimeTemplates->render(
                    $language,
                    'alignment.multiple_missing_word',
                    ['expected' => $expected],
                )
                : $this->runtimeTemplates->render(
                    $language,
                    'alignment.multiple_missing_word_fallback',
                ),
            'insert' => $actual !== ''
                ? $this->runtimeTemplates->render(
                    $language,
                    'alignment.multiple_extra_word',
                    ['actual' => $actual],
                )
                : $this->runtimeTemplates->render(
                    $language,
                    'alignment.multiple_extra_word_fallback',
                ),
            'substitute' => $expected !== '' && $actual !== ''
                ? $this->runtimeTemplates->render(
                    $language,
                    'alignment.multiple_replaced_word',
                    ['actual' => $actual, 'expected' => $expected],
                )
                : $this->runtimeTemplates->render(
                    $language,
                    'alignment.multiple_replaced_word_fallback',
                ),
            default => $this->runtimeTemplates->render(
                $language,
                'alignment.multiple_default',
            ),
        };
    }
}
