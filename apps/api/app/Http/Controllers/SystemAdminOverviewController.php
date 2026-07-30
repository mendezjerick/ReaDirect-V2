<?php

namespace App\Http\Controllers;

use App\Services\SpeechProcessingSettings;
use App\Services\SystemAdminOverviewService;
use Illuminate\Http\JsonResponse;

final class SystemAdminOverviewController extends Controller
{
    public function show(
        SpeechProcessingSettings $speechSettings,
        SystemAdminOverviewService $overview,
    ): JsonResponse {
        return response()->json($overview->build($speechSettings));
    }
}
