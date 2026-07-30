<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\GuestAccount;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\SystemAdminGuestDirectoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class SystemAdminGuestController extends Controller
{
    public function __construct(
        private readonly SystemAdminGuestDirectoryService $guestDirectory,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->guestDirectory->build());
    }

    public function updateAccess(Request $request, GuestAccount $guestAccount): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        /** @var StaffUser $systemAdministrator */
        $systemAdministrator = $request->user();
        $requestedActive = (bool) $validated['is_active'];

        [$guest, $revokedSessions] = DB::transaction(function () use (
            $guestAccount,
            $requestedActive,
            $systemAdministrator,
        ): array {
            /** @var GuestAccount $lockedGuest */
            $lockedGuest = GuestAccount::query()
                ->lockForUpdate()
                ->findOrFail($guestAccount->id);

            if ($lockedGuest->is_active === $requestedActive) {
                return [$lockedGuest, 0];
            }

            $lockedGuest->forceFill(['is_active' => $requestedActive])->save();
            $revokedSessions = 0;

            if (! $requestedActive) {
                $revokedSessions = $lockedGuest->sessions()
                    ->whereNull('revoked_at')
                    ->where('expires_at', '>', now())
                    ->update(['revoked_at' => now()]);
            }

            $action = $requestedActive ? 'reactivated' : 'deactivated';

            StaffAuditLog::query()->create([
                'staff_user_id' => $systemAdministrator->id,
                'action_key' => "guest_access.{$action}",
                'description' => ucfirst($action)." Guest account {$lockedGuest->email}.",
                'metadata' => [
                    'guest_account_id' => $lockedGuest->id,
                    'revoked_session_count' => $revokedSessions,
                ],
            ]);

            return [$lockedGuest, $revokedSessions];
        });

        $guest->loadCount([
            'sessions as active_session_count' => fn ($query) => $query
                ->whereNull('revoked_at')
                ->where('expires_at', '>', now()),
        ]);

        return response()->json([
            'guest' => $this->guestDirectory->serialize($guest),
            'revoked_sessions' => $revokedSessions,
        ]);
    }
}
