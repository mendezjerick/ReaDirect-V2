<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\LearnerSessionResolver;
use App\Services\LearnerSpeechLanguageService;
use App\Support\SpeechLanguage;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class LearnerSpeechLanguageController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
        private readonly LearnerSpeechLanguageService $speechLanguage,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);

        return $this->json($this->speechLanguage->contract($session->learner));
    }

    public function update(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $validated = $request->validate([
            'speech_language' => [
                'required',
                'string',
                Rule::in(SpeechLanguage::codes()),
            ],
        ]);

        try {
            $contract = $this->speechLanguage->update(
                $session->learner,
                $validated['speech_language'],
            );
        } catch (DomainException $error) {
            return $this->json(['message' => $error->getMessage()], 409);
        }

        $session->forceFill(['last_seen_at' => now()])->save();

        return $this->json($contract);
    }

    /** @param array<string, mixed> $payload */
    private function json(array $payload, int $status = 200): JsonResponse
    {
        return response()->json($payload, $status)->withHeaders([
            'Cache-Control' => 'private, no-store',
            'Pragma' => 'no-cache',
        ]);
    }
}
