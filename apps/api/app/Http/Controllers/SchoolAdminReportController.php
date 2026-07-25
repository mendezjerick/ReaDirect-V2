<?php

namespace App\Http\Controllers;

use App\Models\StaffUser;
use App\Services\SchoolAdminReportService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminReportController extends Controller
{
    public function __construct(
        private readonly SchoolAdminReportService $reports,
    ) {}

    public function show(StaffUser $staffUser): JsonResponse
    {
        if ($staffUser->role !== 'school_admin' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null) {
            throw new HttpException(
                409,
                'School setup is required before opening reports.',
            );
        }

        return response()->json($this->reports->build($staffUser));
    }
}
