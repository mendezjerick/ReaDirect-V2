<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SystemAdminOperationsService;
use Illuminate\Http\JsonResponse;

final class SystemAdminOperationsController extends Controller
{
    public function auditLogs(
        SystemAdminOperationsService $operations,
    ): JsonResponse {
        return response()->json($operations->auditLogs());
    }

    public function gamesAndPlayers(
        SystemAdminOperationsService $operations,
    ): JsonResponse {
        return response()->json($operations->gamesAndPlayers());
    }
}
