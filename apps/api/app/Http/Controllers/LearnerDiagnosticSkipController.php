<?php

namespace App\Http\Controllers;

use App\Services\LearnerDiagnosticSkipService;
use App\Services\LearnerReadingPathService;
use App\Services\LearnerSessionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LearnerDiagnosticSkipController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessionResolver,
        private readonly LearnerDiagnosticSkipService $diagnosticSkip,
        private readonly LearnerReadingPathService $readingPath,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $session = $this->sessionResolver->resolve($request);
        $this->diagnosticSkip->skip($session->learner);

        $learner = $session->learner->fresh('progressState');

        return response()->json([
            'reading_path' => $this->readingPath->snapshot(
                $learner,
                $learner->progressState,
            ),
        ])->withHeaders([
            'Cache-Control' => 'private, no-store',
            'Pragma' => 'no-cache',
        ]);
    }
}
