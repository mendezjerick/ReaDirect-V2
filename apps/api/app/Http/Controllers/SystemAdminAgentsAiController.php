<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SpeechProcessingSettings;
use App\Services\SystemAdminAgentsAiService;
use Illuminate\Http\JsonResponse;

final class SystemAdminAgentsAiController extends Controller
{
    public function settings(
        SpeechProcessingSettings $speechSettings,
        SystemAdminAgentsAiService $agentsAi,
    ): JsonResponse {
        return response()->json($agentsAi->settings($speechSettings));
    }

    public function promptTemplates(
        SystemAdminAgentsAiService $agentsAi,
    ): JsonResponse {
        return response()->json($agentsAi->promptTemplates());
    }
}
