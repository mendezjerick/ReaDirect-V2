<?php

namespace Database\Seeders;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Database\Seeder;

final class PilotDeploymentSeeder extends Seeder
{
    private const EXPECTED_SPEECH_LINES = 300;

    public function run(): void
    {
        $this->call([
            SystemAdministratorSeeder::class,
            LetterEquivalenceSeeder::class,
            CvcVowelEquivalenceSeeder::class,
            PortalSystemLearnerSeeder::class,
            GameCatalogSeeder::class,
        ]);

        if (! $this->hasCompleteVoice('clara-sh-v1')) {
            $this->call(TtsSpeechCatalogSeeder::class);
        }

        if (! $this->hasCompleteVoice(FilipinoTtsSpeechCatalogSeeder::VOICE_KEY)) {
            $this->call(FilipinoTtsSpeechCatalogSeeder::class);
        }
    }

    private function hasCompleteVoice(string $stableKey): bool
    {
        $voice = TtsVoiceVersion::query()
            ->where('stable_key', $stableKey)
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->first();

        return $voice !== null
            && TtsSpeechLine::query()
                ->where('tts_voice_version_id', $voice->id)
                ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
                ->count() === self::EXPECTED_SPEECH_LINES;
    }
}
