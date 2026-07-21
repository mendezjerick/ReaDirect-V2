<?php

namespace App\Http\Controllers;

use App\Models\StaffUser;
use App\Services\SpeechConfusionMatrix;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class SystemAdminSpeechAnalyticsController extends Controller
{
    public function rawConfusionMatrix(
        Request $request,
        StaffUser $staffUser,
        SpeechConfusionMatrix $matrix,
    ): JsonResponse {
        $this->assertSystemAdministrator($staffUser);
        $validated = $request->validate([
            'fixture_set' => ['nullable', Rule::in(['millie2', 'millie2-plus', 'jz', 'shai'])],
            'task_type' => [
                'nullable',
                Rule::in(['letter', 'word', 'phrase', 'sentence', 'passage', 'comprehension']),
            ],
        ]);

        return response()->json($matrix->raw(
            $validated['fixture_set'] ?? null,
            $validated['task_type'] ?? null,
        ));
    }

    private function assertSystemAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'system_admin' || ! $staffUser->is_active) {
            abort(404);
        }
    }
}
