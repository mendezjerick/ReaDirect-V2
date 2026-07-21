<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const OLD_KEY = 'speech.conditional_noise_reduction';

    private const MU_KEY = 'speech.mu_conditional_noise_reduction';

    public function up(): void
    {
        $oldSetting = DB::table('system_settings')->where('key', self::OLD_KEY)->first();
        $muSettingExists = DB::table('system_settings')->where('key', self::MU_KEY)->exists();

        if ($oldSetting && ! $muSettingExists) {
            DB::table('system_settings')
                ->where('key', self::OLD_KEY)
                ->update(['key' => self::MU_KEY, 'updated_at' => now()]);

            return;
        }

        if (! $muSettingExists) {
            DB::table('system_settings')->insert([
                'key' => self::MU_KEY,
                'value' => json_encode(['enabled' => false], JSON_THROW_ON_ERROR),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('system_settings')->where('key', self::OLD_KEY)->delete();
    }

    public function down(): void
    {
        DB::table('system_settings')
            ->where('key', self::MU_KEY)
            ->update(['key' => self::OLD_KEY, 'updated_at' => now()]);
    }
};
