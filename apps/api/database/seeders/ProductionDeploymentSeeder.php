<?php

namespace Database\Seeders;

use App\Models\Learner;
use App\Models\StaffUser;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Database\Seeder;

final class ProductionDeploymentSeeder extends Seeder
{
    private const ENGLISH_VOICE_KEY = 'clara-sh-v1';

    private const EXPECTED_ENGLISH_SPEECH_LINES = 320;

    private const EXPECTED_FILIPINO_SPEECH_LINES = 300;

    public function run(): void
    {
        if (! StaffUser::query()
            ->where('role', 'system_admin')
            ->where('is_active', true)
            ->exists()) {
            $this->call(SystemAdministratorSeeder::class);
        }

        $this->call([
            LetterEquivalenceSeeder::class,
            CvcVowelEquivalenceSeeder::class,
        ]);

        if (! Learner::query()
            ->where('learner_code', 'KW000')
            ->where('account_purpose', Learner::PURPOSE_PORTAL_SYSTEM)
            ->exists()) {
            $this->call(PortalSystemLearnerSeeder::class);
        }

        $this->call(GameCatalogSeeder::class);

        if (! $this->hasCompleteVoice(
            self::ENGLISH_VOICE_KEY,
            self::EXPECTED_ENGLISH_SPEECH_LINES,
        )) {
            $this->call(TtsSpeechCatalogSeeder::class);
        }

        if (! $this->hasCompleteVoice(
            FilipinoTtsSpeechCatalogSeeder::VOICE_KEY,
            self::EXPECTED_FILIPINO_SPEECH_LINES,
        )) {
            $this->call(FilipinoTtsSpeechCatalogSeeder::class);
        }
    }

    private function hasCompleteVoice(string $stableKey, int $expectedLines): bool
    {
        $voice = TtsVoiceVersion::query()
            ->where('stable_key', $stableKey)
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->first();

        return $voice !== null
            && TtsSpeechLine::query()
                ->where('tts_voice_version_id', $voice->id)
                ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
                ->count() === $expectedLines;
    }
}
