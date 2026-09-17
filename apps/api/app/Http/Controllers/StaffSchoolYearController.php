<?php

namespace App\Http\Controllers;

use App\Enums\StaffRealtimeTopic;
use App\Models\StaffUser;
use App\Services\StaffRealtimePublisher;
use App\Services\StaffSchoolYearService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StaffSchoolYearController extends Controller
{
    public function index(
        Request $request,
        StaffSchoolYearService $years,
    ): JsonResponse {
        /** @var StaffUser $staffUser */
        $staffUser = $request->user();
        $context = $request->attributes->get(StaffSchoolYearService::REQUEST_ATTRIBUTE);
        $selectedLabel = is_array($context) ? ($context['label'] ?? null) : null;

        $available = $years->available($staffUser);

        return response()->json([
            'school_years' => $available,
            'selected_school_year' => $selectedLabel === null
                ? null
                : collect($available)->firstWhere('label', $selectedLabel),
        ]);
    }

    public function store(
        Request $request,
        StaffSchoolYearService $years,
        StaffRealtimePublisher $realtime,
    ): JsonResponse {
        /** @var StaffUser $staffUser */
        $staffUser = $request->user();
        $validated = $request->validate([
            'label' => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
        ]);
        $year = $years->createForSchool($staffUser, $validated['label']);
        $realtime->school(
            $staffUser->school_id,
            StaffRealtimeTopic::Overview,
            StaffRealtimeTopic::Classes,
            StaffRealtimeTopic::Teachers,
            StaffRealtimeTopic::Learners,
            StaffRealtimeTopic::Reports,
            StaffRealtimeTopic::InstructionalInsights,
            StaffRealtimeTopic::Operations,
        );

        return response()->json([
            'school_year' => [
                'id' => $year->id,
                'label' => $year->label,
                'start_year' => $year->start_year,
                'end_year' => $year->end_year,
                'is_current' => $year->is_current,
                'status' => $year->status,
            ],
        ], 201);
    }
}
