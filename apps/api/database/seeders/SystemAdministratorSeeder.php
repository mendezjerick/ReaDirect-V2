<?php

namespace Database\Seeders;

use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Database\Seeder;
use RuntimeException;

final class SystemAdministratorSeeder extends Seeder
{
    public function run(): void
    {
        $username = config('pilot.system_admin_username');
        $password = config('pilot.system_admin_password');

        if (! is_string($username) || $username === '' || ! is_string($password) || $password === '') {
            throw new RuntimeException('System Administrator credentials are not configured.');
        }

        $staffUser = StaffUser::query()->updateOrCreate(
            ['username' => mb_strtolower($username)],
            [
                'password' => $password,
                'role' => 'system_admin',
                'display_name' => 'System Administrator',
                'is_active' => true,
                'requires_credential_setup' => false,
            ],
        );

        StaffAuditLog::query()->firstOrCreate(
            [
                'staff_user_id' => $staffUser->id,
                'action_key' => 'system_admin.seeded',
            ],
            [
                'description' => 'Development System Administrator account prepared.',
                'metadata' => ['source' => 'SystemAdministratorSeeder'],
            ],
        );
    }
}
