<?php

namespace App\Http\Controllers;

use App\Services\LearnerSessionResolver;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;

final class LearnerTtsController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
    ) {}

    public function speech(Request $request, string $speechKey): Response|JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $speech = config("speech.clara_lines.{$speechKey}");

        if (! is_array($speech) || ! isset($speech['text'], $speech['reference'])) {
            abort(404, 'That Clara speech line is not available.');
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        try {
            $upstream = Http::accept('audio/wav')
                ->connectTimeout((int) config('speech.tts_connect_timeout_seconds'))
                ->timeout((int) config('speech.tts_request_timeout_seconds'))
                ->post(rtrim((string) config('speech.tts_url'), '/').'/synthesize', [
                    'text' => $speech['text'],
                    'reference' => $speech['reference'],
                ]);
        } catch (ConnectionException $error) {
            report($error);

            return response()->json([
                'message' => 'Ma\'am Clara is still getting her voice ready. Please try again.',
            ], 503);
        }

        if (! $upstream->successful()) {
            return response()->json([
                'message' => 'Ma\'am Clara could not prepare that line yet. Please try again.',
            ], 503);
        }

        return response($upstream->body(), 200, [
            'Content-Type' => 'audio/wav',
            'Cache-Control' => 'no-store',
            'X-ReaDirect-Clara-Speech' => $speechKey,
        ]);
    }
}
