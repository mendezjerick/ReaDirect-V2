<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SystemAdminTeacherDirectoryService;
use Illuminate\Http\JsonResponse;

final class SystemAdminTeacherController extends Controller
{
    public function __construct(
        private readonly SystemAdminTeacherDirectoryService $teacherDirectory,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->teacherDirectory->build());
    }
}
