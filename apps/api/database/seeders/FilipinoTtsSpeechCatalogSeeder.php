<?php

namespace Database\Seeders;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\FilipinoTtsCatalogSource;
use App\Services\PublishedWavInspector;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class FilipinoTtsSpeechCatalogSeeder extends Seeder
{
    public const VOICE_KEY = 'clara-sh-fil-v1';

    private const CATALOG_DISK = 'tts_catalog';

    private const EXPECTED_LINE_COUNT = 300;

    public function run(): void
    {
        $definitions = app(FilipinoTtsCatalogSource::class)
            ->publicationDefinitions(
                verifyReferenceAudio: ! config('pilot.enabled', false),
            );
        if (count($definitions) !== self::EXPECTED_LINE_COUNT) {
            throw new RuntimeException(sprintf(
                'Expected %d approved Filipino TTS lines, resolved %d.',
                self::EXPECTED_LINE_COUNT,
                count($definitions),
            ));
        }

        DB::transaction(function () use ($definitions): void {
            $voice = TtsVoiceVersion::query()->firstOrNew([
                'stable_key' => self::VOICE_KEY,
            ]);
            $voice->fill([
                'language_code' => 'fil-PH',
                'engine' => 'VoxCPM2',
                'model_identifier' => 'openbmb/VoxCPM2',
                'reference_set' => 'sh-fil',
                'conditioning_version' => 'mono-peak-minus-6db-v1',
                'synthesis_config' => [
                    'cfg_value' => 2.0,
                    'inference_timesteps' => 10,
                    'normalize' => true,
                    'denoise' => false,
                    'retry_badcase' => true,
                    'retry_badcase_max_times' => 3,
                    'retry_badcase_ratio_threshold' => 6.0,
                ],
                'status' => TtsVoiceVersion::STATUS_PUBLISHED,
                'published_at' => $voice->published_at ?? now(),
            ]);
            $voice->save();

            $disk = Storage::disk(self::CATALOG_DISK);
            $inspector = app(PublishedWavInspector::class);
            foreach ($definitions as $speechKey => $definition) {
                $relativePath = "sh-fil/{$definition['path']}";
                if (! $disk->exists($relativePath)) {
                    throw new RuntimeException(
                        "Published Filipino TTS audio is missing: {$relativePath}",
                    );
                }

                $absolutePath = $disk->path($relativePath);
                $metadata = $inspector->inspect($absolutePath);
                $generatedAt = filemtime($absolutePath);
                if ($generatedAt === false) {
                    throw new RuntimeException(
                        "Cannot read Filipino TTS generation time: {$relativePath}",
                    );
                }

                $line = TtsSpeechLine::query()->firstOrNew([
                    'tts_voice_version_id' => $voice->id,
                    'speech_key' => $speechKey,
                ]);
                $line->fill([
                    'text' => $definition['text'],
                    'reference_role' => $definition['reference'],
                    'audio_storage_disk' => self::CATALOG_DISK,
                    'audio_storage_path' => $relativePath,
                    'audio_sha256' => hash_file('sha256', $absolutePath),
                    'duration_ms' => $metadata['duration_ms'],
                    'status' => TtsSpeechLine::STATUS_PUBLISHED,
                    'generated_at' => date('Y-m-d H:i:s', $generatedAt),
                    'approved_at' => $line->approved_at ?? now(),
                ]);
                $line->save();
            }

            TtsSpeechLine::query()
                ->where('tts_voice_version_id', $voice->id)
                ->whereNotIn('speech_key', array_keys($definitions))
                ->update(['status' => 'retired']);
        });
    }
}
