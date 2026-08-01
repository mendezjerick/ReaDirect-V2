<?php

namespace App\Http\Controllers;

use App\Events\RealtimeTransportProbe;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StaffRealtimeController extends Controller
{
    public function config(Request $request): JsonResponse
    {
        /** @var StaffUser $staffUser */
        $staffUser = $request->attributes->get('staff_user');
        $key = config('broadcasting.connections.reverb.key');
        $enabled = config('broadcasting.default') === 'reverb'
            && is_string($key)
            && $key !== '';
        $dataChannels = match ($staffUser->role) {
            'system_admin' => ['staff.system'],
            'school_admin' => $staffUser->school_id !== null
                ? ["schools.{$staffUser->school_id}"]
                : [],
            'teacher' => ["teachers.{$staffUser->id}"],
            default => [],
        };

        return response()->json([
            'enabled' => $enabled,
            'app_key' => $enabled ? $key : null,
            'auth_endpoint' => '/api/staff/broadcasting/auth',
            'channel' => "staff.users.{$staffUser->id}",
            'data_channels' => $dataChannels,
        ]);
    }

    public function probe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nonce' => ['required', 'uuid'],
        ]);
        /** @var StaffUser $staffUser */
        $staffUser = $request->attributes->get('staff_user');

        RealtimeTransportProbe::dispatch($staffUser->id, $validated['nonce']);

        return response()->json(['queued' => true], 202);
    }
}
