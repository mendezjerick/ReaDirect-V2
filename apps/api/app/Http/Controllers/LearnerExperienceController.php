<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\LearnerLightweightModeSettings;
use App\Services\LearnerSessionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LearnerExperienceController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessions,
        private readonly LearnerLightweightModeSettings $lightweightMode,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $this->sessions->resolve($request);

        return response()->json($this->lightweightMode->learnerContract());
    }

    /**
     * The unauthenticated landing intro needs the same renderer decision before
     * it can mount Clara. This contract intentionally contains only effective,
     * non-private modes and no learner or administrator data.
     */
    public function intro(): JsonResponse
    {
        return response()->json($this->lightweightMode->learnerContract());
    }
}
