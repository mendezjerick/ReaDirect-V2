<?php

namespace App\Http\Controllers;

use App\Services\SpeechServiceHealthService;
use Illuminate\Http\JsonResponse;

final class SpeechServiceReadinessController extends Controller
{
    public function __invoke(
        SpeechServiceHealthService $speechServiceHealth,
    ): JsonResponse {
        return response()->json($speechServiceHealth->readiness());
    }
}
