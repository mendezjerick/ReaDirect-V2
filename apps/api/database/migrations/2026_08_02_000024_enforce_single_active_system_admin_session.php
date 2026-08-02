<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $activeSessionIds = DB::table('staff_sessions')
            ->join('staff_users', 'staff_users.id', '=', 'staff_sessions.staff_user_id')
            ->where('staff_users.role', 'system_admin')
            ->whereNull('staff_sessions.revoked_at')
            ->where('staff_sessions.expires_at', '>', $now)
            ->orderByDesc('staff_sessions.id')
            ->pluck('staff_sessions.id');

        $sessionsToRevoke = $activeSessionIds->slice(1)->all();
        if ($sessionsToRevoke !== []) {
            DB::table('staff_sessions')
                ->whereIn('id', $sessionsToRevoke)
                ->update([
                    'revoked_at' => $now,
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        // Revoked sessions cannot be safely reactivated during rollback.
    }
};
