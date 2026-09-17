<?php

namespace App\Http\Middleware;

use App\Models\StaffUser;
use App\Services\StaffSchoolYearService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ResolveStaffSchoolYear
{
    public function __construct(
        private readonly StaffSchoolYearService $years,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $staffUser = $request->user();
        if ($staffUser instanceof StaffUser) {
            $requestedLabel = $request->query('school_year');
            $context = $this->years->resolve(
                $staffUser,
                is_string($requestedLabel) ? $requestedLabel : null,
            );
            $request->attributes->set(StaffSchoolYearService::REQUEST_ATTRIBUTE, $context);
        }

        return $next($request);
    }
}
