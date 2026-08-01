<?php

use App\Models\StaffUser;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel(
    'staff.users.{staffUserId}',
    static fn (StaffUser $staffUser, int $staffUserId): bool => $staffUser->id === $staffUserId,
);

Broadcast::channel(
    'staff.system',
    static fn (StaffUser $staffUser): bool => $staffUser->role === 'system_admin',
);

Broadcast::channel(
    'schools.{schoolId}',
    static fn (StaffUser $staffUser, int $schoolId): bool => $staffUser->role === 'system_admin'
        || ($staffUser->role === 'school_admin' && $staffUser->school_id === $schoolId),
);

Broadcast::channel(
    'teachers.{teacherId}',
    static function (StaffUser $staffUser, int $teacherId): bool {
        if ($staffUser->role === 'system_admin' || $staffUser->id === $teacherId) {
            return true;
        }

        if ($staffUser->role !== 'school_admin' || $staffUser->school_id === null) {
            return false;
        }

        return StaffUser::query()
            ->whereKey($teacherId)
            ->where('role', 'teacher')
            ->where('school_id', $staffUser->school_id)
            ->exists();
    },
);
