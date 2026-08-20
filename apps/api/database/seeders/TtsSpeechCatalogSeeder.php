<?php

namespace Database\Seeders;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\PublishedTtsCatalogDefinitions;
use App\Services\PublishedWavInspector;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class TtsSpeechCatalogSeeder extends Seeder
{
    private const CATALOG_DISK = 'tts_catalog';

    private const VOICE_KEY = 'clara-sh-v1';

    private const EXPECTED_LINE_COUNT = 320;

    public function run(): void
    {
        $definitions = $this->speechDefinitions();
        if (count($definitions) !== self::EXPECTED_LINE_COUNT) {
            throw new RuntimeException(sprintf(
                'Expected %d published TTS lines, resolved %d.',
                self::EXPECTED_LINE_COUNT,
                count($definitions),
            ));
        }
        foreach ($definitions as $speechKey => $definition) {
            if (str_contains($definition['text'], '!')) {
                throw new RuntimeException(
                    "Published TTS text cannot contain exclamation marks: {$speechKey}",
                );
            }
        }

        DB::transaction(function () use ($definitions): void {
            $voice = TtsVoiceVersion::query()->firstOrNew([
                'stable_key' => self::VOICE_KEY,
            ]);
            $voice->fill([
                'language_code' => 'en',
                'engine' => 'VoxCPM2',
                'model_identifier' => 'openbmb/VoxCPM2',
                'reference_set' => 'sh',
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

            foreach ($definitions as $speechKey => $definition) {
                $relativePath = "sh/{$definition['path']}";
                $disk = Storage::disk(self::CATALOG_DISK);
                if (! $disk->exists($relativePath)) {
                    throw new RuntimeException("Published TTS audio is missing: {$relativePath}");
                }

                $absolutePath = $disk->path($relativePath);
                $metadata = $this->wavMetadata($absolutePath);
                $line = TtsSpeechLine::query()->firstOrNew([
                    'tts_voice_version_id' => $voice->id,
                    'speech_key' => $speechKey,
                ]);
                $generatedAt = filemtime($absolutePath);
                if ($generatedAt === false) {
                    throw new RuntimeException("Cannot read TTS generation time: {$relativePath}");
                }

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

    /** @return array<string, array{text: string, reference: string, path: string}> */
    private function speechDefinitions(): array
    {
        return app(PublishedTtsCatalogDefinitions::class)->english();
    }

    /** @return array{duration_ms: int} */
    private function wavMetadata(string $path): array
    {
        return app(PublishedWavInspector::class)->inspect($path);
    }
}
