<?php

namespace App\Http\Controllers;

use App\Models\StaffUser;
use App\Services\SchoolAdminInstructionalInsightsService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class SchoolAdminInstructionalInsightsController extends Controller
{
    public function __construct(
        private readonly SchoolAdminInstructionalInsightsService $insights,
    ) {}

    public function show(StaffUser $staffUser): JsonResponse
    {
        if ($staffUser->role !== 'school_admin' || ! $staffUser->is_active) {
            abort(404);
        }

        if ($staffUser->school_id === null) {
            throw new HttpException(
                409,
                'School setup is required before opening instructional insights.',
            );
        }

        return response()->json($this->insights->build($staffUser));
    }
}
