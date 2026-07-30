<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SystemAdminLearnerDirectoryService;
use Illuminate\Http\JsonResponse;

final class SystemAdminLearnerController extends Controller
{
    public function __construct(
        private readonly SystemAdminLearnerDirectoryService $learnerDirectory,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->learnerDirectory->build());
    }
}
