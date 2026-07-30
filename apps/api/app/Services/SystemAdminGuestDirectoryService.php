<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\GuestAccount;
use Illuminate\Support\Collection;

final class SystemAdminGuestDirectoryService
{
    public function build(): array
    {
        $guests = GuestAccount::query()
            ->withCount([
                'sessions as active_session_count' => fn ($query) => $query
                    ->whereNull('revoked_at')
                    ->where('expires_at', '>', now()),
            ])
            ->orderByRaw('LOWER(email)')
            ->get();

        return [
            'summary' => [
                'total_guests' => $guests->count(),
                'active_guests' => $guests->where('is_active', true)->count(),
                'verified_guests' => $guests
                    ->filter(fn (GuestAccount $guest): bool => $guest->email_verified_at !== null)
                    ->count(),
                'pending_verification' => $guests
                    ->filter(fn (GuestAccount $guest): bool => $guest->email_verified_at === null)
                    ->count(),
                'active_sessions' => $guests->sum('active_session_count'),
            ],
            'guests' => $this->serializeMany($guests),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function serialize(GuestAccount $guest): array
    {
        return [
            'id' => $guest->id,
            'email' => $guest->email,
            'display_name' => $guest->display_name,
            'is_active' => $guest->is_active,
            'email_verified_at' => $guest->email_verified_at?->toIso8601String(),
            'last_signed_in_at' => $guest->last_signed_in_at?->toIso8601String(),
            'active_session_count' => (int) ($guest->active_session_count ?? 0),
            'created_at' => $guest->created_at?->toIso8601String(),
        ];
    }

    private function serializeMany(Collection $guests): Collection
    {
        return $guests
            ->map(fn (GuestAccount $guest): array => $this->serialize($guest))
            ->values();
    }
}
