<?php

namespace App\Http\Controllers;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\LearnerSessionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Throwable;

final class LearnerTtsController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
    ) {}

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
}
