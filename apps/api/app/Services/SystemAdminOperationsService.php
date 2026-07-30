<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\GameCatalog;
use App\Models\GameProfile;
use App\Models\GameSave;
use App\Models\Learner;
use App\Models\StaffAuditLog;

final class SystemAdminOperationsService
{
    private const AUDIT_LOG_LIMIT = 500;

    public function auditLogs(): array
    {
        $logs = StaffAuditLog::query()
            ->with('staffUser:id,display_name,username,role')
            ->latest()
            ->latest('id')
            ->limit(self::AUDIT_LOG_LIMIT)
            ->get();

        return [
            'summary' => [
                'total_events' => StaffAuditLog::query()->count(),
                'events_last_24_hours' => StaffAuditLog::query()
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
                'visible_events' => $logs->count(),
                'unique_actors' => $logs
                    ->pluck('staff_user_id')
                    ->filter()
                    ->unique()
                    ->count(),
                'retention_note' => 'Showing the 500 most recent events.',
            ],
            'logs' => $logs
                ->map(fn (StaffAuditLog $log): array => [
                    'id' => $log->id,
                    'action_key' => $log->action_key,
                    'description' => $log->description,
                    'actor' => $log->staffUser?->display_name
                        ?? $log->staffUser?->username
                        ?? 'System',
                    'actor_role' => $log->staffUser?->role,
                    'occurred_at' => $log->created_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function gamesAndPlayers(): array
    {
        $games = GameCatalog::query()
            ->withCount([
                'saves as saves_count' => fn ($query) => $query
                    ->whereHas(
                        'profile.learner',
                        fn ($learnerQuery) => $learnerQuery->where(
                            'account_purpose',
                            Learner::PURPOSE_STANDARD,
                        ),
                    ),
                'saves as player_count' => fn ($query) => $query
                    ->whereHas(
                        'profile.learner',
                        fn ($learnerQuery) => $learnerQuery->where(
                            'account_purpose',
                            Learner::PURPOSE_STANDARD,
                        ),
                    )
                    ->selectRaw('COUNT(DISTINCT game_profile_id)'),
            ])
            ->orderBy('slot')
            ->get();
        $profiles = GameProfile::query()
            ->with([
                'learner.school:id,name',
                'saves' => fn ($query) => $query
                    ->with('game:id,game_key,display_title')
                    ->latest('saved_at'),
            ])
            ->where('audience', GameProfile::AUDIENCE_LEARNER)
            ->whereHas(
                'learner',
                fn ($query) => $query->where(
                    'account_purpose',
                    Learner::PURPOSE_STANDARD,
                ),
            )
            ->orderBy('username_normalized')
            ->orderBy('discriminator')
            ->get();

        return [
            'summary' => [
                'catalog_games' => $games->count(),
                'active_games' => $games->where('is_active', true)->count(),
                'player_profiles' => $profiles->count(),
                'active_player_profiles' => $profiles->where('is_active', true)->count(),
                'players_with_saves' => $profiles
                    ->filter(fn (GameProfile $profile): bool => $profile->saves->isNotEmpty())
                    ->count(),
                'save_slots' => $profiles->sum(
                    fn (GameProfile $profile): int => $profile->saves->count(),
                ),
                'guest_game_persistence_available' => false,
            ],
            'games' => $games
                ->map(fn (GameCatalog $game): array => [
                    'id' => $game->id,
                    'game_key' => $game->game_key,
                    'display_title' => $game->display_title,
                    'slot' => $game->slot,
                    'engine' => $game->engine,
                    'contract_version' => $game->contract_version,
                    'ruleset_version' => $game->current_ruleset_version,
                    'has_meaningful_progression' => $game->has_meaningful_progression,
                    'is_active' => $game->is_active,
                    'player_count' => (int) $game->player_count,
                    'save_count' => (int) $game->saves_count,
                ])
                ->values()
                ->all(),
            'players' => $profiles
                ->map(fn (GameProfile $profile): array => $this->serializePlayer($profile))
                ->values()
                ->all(),
            'governance' => [
                'read_only' => true,
                'message' => 'Player inspection cannot reset, edit, delete, restore, impersonate, or change scores and saves.',
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function serializePlayer(GameProfile $profile): array
    {
        $learner = $profile->learner;

        return [
            'id' => $profile->id,
            'handle' => "{$profile->username}#{$profile->discriminator}",
            'is_active' => $profile->is_active,
            'username_changed_at' => $profile->username_changed_at?->toIso8601String(),
            'learner' => [
                'id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'full_name' => $this->fullName($learner),
                'school_name' => $learner->school?->name,
                'is_active' => $learner->is_active,
            ],
            'saves' => $profile->saves
                ->map(fn (GameSave $save): array => [
                    'game_key' => $save->game?->game_key ?? '',
                    'game_title' => $save->game?->display_title ?? 'Unavailable game',
                    'checkpoint_key' => $save->checkpoint_key,
                    'save_schema_version' => $save->save_schema_version,
                    'revision' => $save->revision,
                    'saved_at' => $save->saved_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
        ];
    }

    private function fullName(Learner $learner): string
    {
        return implode(' ', array_filter([
            $learner->first_name,
            $learner->middle_name,
            $learner->last_name,
            $learner->suffix,
        ]));
    }
}
