<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\TtsSpeechLine;
use App\Services\IsolatedLetterPronunciation;
use App\Services\LearnerAssessmentAsr;
use App\Services\LearnerSpeechPolicy;
use App\Services\PublishedTtsVoiceResolver;
use App\Services\RuntimeSpeechTemplateRenderer;
use App\Support\SpeechLanguage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use RuntimeException;
use Throwable;

final class GuestMediaController extends Controller
{
    public function __construct(
        private readonly LearnerAssessmentAsr $asr,
        private readonly PublishedTtsVoiceResolver $publishedVoices,
    ) {}

    public function evaluate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', Rule::in(['orientation', 'letter', 'word', 'phrase', 'passage'])],
            'target' => ['required', 'string', 'max:1600'],
            'audio' => ['required', 'file', 'max:25600'],
        ]);

        /** @var UploadedFile $audio */
        $audio = $validated['audio'];
        $target = trim((string) $validated['target']);
        $mode = (string) $validated['mode'];

        try {
            $evidence = match ($mode) {
                'orientation' => $this->asr->orientation($audio),
                'letter' => $this->asr->letter($audio, $target),
                'word' => $this->asr->word($audio, $target),
                'phrase' => $this->asr->phrase($audio, $target),
                'passage' => $this->asr->passage($audio, $target),
            };
        } catch (RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 503);
        }

        $usable = (bool) data_get($evidence, 'audio_quality.usable', true);
        $transcript = trim((string) ($evidence['raw_transcript'] ?? ''));
        if ($mode === 'letter') {
            $transcript = trim((string) ($evidence['predicted_class'] ?? $transcript));
            $correct = strtoupper($transcript) === strtoupper($target)
                || strtoupper((string) ($evidence['decision'] ?? '')) === 'CORRECT';
        } elseif ($mode === 'orientation') {
            $correct = $usable;
        } else {
            $correct = $this->similarity($target, $transcript) >= ($mode === 'passage' ? 0.72 : 0.9);
        }

        return response()->json([
            'correct' => $usable && $correct,
            'transcript' => $transcript,
            'usable' => $usable,
        ]);
    }

    public function feedback(
        Request $request,
        RuntimeSpeechTemplateRenderer $templates,
        IsolatedLetterPronunciation $letters,
        LearnerSpeechPolicy $policy,
    ): Response|JsonResponse {
        // ASVS 2.2.1/2.2.2: bound public input; callers cannot select a URL or template.
        $validated = $request->validate([
            'lesson' => ['required', 'integer', 'between:1,4'],
            'transcript' => ['nullable', 'string', 'max:500'],
            'language' => ['required', Rule::in(SpeechLanguage::codes())],
        ]);
        if ($policy->isPublishedOnly()) {
            return response()->json(['message' => 'Prepared feedback is available.'], 409);
        }
        $lesson = (int) $validated['lesson'];
        $language = $validated['language'];
        $transcript = trim((string) ($validated['transcript'] ?? ''));
        if ($lesson === 1 && preg_match('/^[A-Z]$/i', $transcript)) {
            $text = $templates->render($language, 'feedback.you_said_letter', [
                'spoken' => $letters->spokenForm($transcript),
            ]);
        } elseif ($lesson !== 1 && $transcript !== '' && strtoupper($transcript) !== 'UNKNOWN') {
            $text = $templates->render($language, 'feedback.you_said_transcript', ['final' => $transcript]);
        } else {
            $unit = [1 => 'letter', 2 => 'word', 3 => 'phrase', 4 => 'sentence'][$lesson];
            $text = $templates->render($language, "feedback.unclear_{$unit}");
        }
        // Stateless guest feedback never resolves a learner record (ASVS 8.2.2).
        try {
            $speech = Http::accept('audio/wav')
                ->withToken((string) config('speech.tts_token'))
                ->connectTimeout(3)
                ->timeout(15)
                ->post(rtrim((string) config('speech.tts_url'), '/').'/synthesize', [
                    'text' => $text, 'reference' => 'result', 'language' => $language,
                ]);
            if ($speech->successful()
                && ($speech->header('X-ReaDirect-TTS-Language') ?: 'en') === $language
                && str_starts_with($speech->body(), 'RIFF')) {
                return response($speech->body(), 200, [
                    'Content-Type' => 'audio/wav',
                    'Cache-Control' => 'private, no-store',
                    'X-ReaDirect-TTS-Source' => 'guest-runtime',
                    'X-ReaDirect-TTS-Language' => $language,
                ]);
            }
        } catch (Throwable) {
            // ASVS 16.5.1/16.5.2: no transcript or service details in errors; client plays prepared audio.
        }

        return response()->json(['message' => 'Prepared feedback is available.'], 503);
    }

    public function speech(Request $request, string $speechKey): Response|JsonResponse
    {
        $validated = $request->validate([
            'language' => ['nullable', Rule::in(SpeechLanguage::codes())],
        ]);
        $language = SpeechLanguage::normalize($validated['language'] ?? SpeechLanguage::ENGLISH);
        $voice = $this->publishedVoices->forLanguage($language);
        abort_if($voice === null, 404, 'That Clara speech language is not available.');

        $speech = TtsSpeechLine::query()
            ->where('tts_voice_version_id', $voice->id)
            ->where('speech_key', $speechKey)
            ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
            ->orderByDesc('approved_at')
            ->first();
        abort_if($speech === null, 404, 'That Clara speech line is not available.');

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

        return response($audio, 200, [
            'Content-Type' => 'audio/wav',
            'Cache-Control' => 'private, no-store',
            'X-ReaDirect-Clara-Speech' => $speechKey,
            'X-ReaDirect-TTS-Source' => 'guest-published',
            'X-ReaDirect-TTS-Voice' => $voice->stable_key,
            'X-ReaDirect-TTS-Language' => $language,
        ]);
    }

    private function similarity(string $expected, string $actual): float
    {
        $normalize = static fn (string $value): array => array_values(array_filter(
            preg_split('/\s+/', strtolower((string) preg_replace('/[^a-z0-9\s]/i', ' ', $value))) ?: [],
        ));
        $expectedWords = $normalize($expected);
        $actualWords = $normalize($actual);
        if ($expectedWords === []) {
            return $actualWords === [] ? 1.0 : 0.0;
        }

        $remaining = $actualWords;
        $matches = 0;
        foreach ($expectedWords as $word) {
            $index = array_search($word, $remaining, true);
            if ($index === false) {
                continue;
            }
            $matches++;
            unset($remaining[$index]);
        }

        return $matches / count($expectedWords);
    }
}
