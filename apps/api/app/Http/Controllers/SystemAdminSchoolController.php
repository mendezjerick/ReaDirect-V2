<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SystemAdminSchoolDirectoryService;
use Illuminate\Http\JsonResponse;

final class SystemAdminSchoolController extends Controller
{
    public function __construct(
        private readonly SystemAdminSchoolDirectoryService $schoolDirectory,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->schoolDirectory->build());
    }
}
