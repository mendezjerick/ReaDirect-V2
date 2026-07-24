<?php

namespace Database\Seeders;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class TtsSpeechCatalogSeeder extends Seeder
{
    private const CATALOG_DISK = 'tts_catalog';

    private const VOICE_KEY = 'clara-sh-v1';

    private const EXPECTED_LINE_COUNT = 130;

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
        $definitions = [];
        foreach ((array) config('speech.clara_lines') as $speechKey => $speech) {
            if (! is_array($speech)
                || ! isset($speech['text'], $speech['reference'], $speech['path'])
                || ! is_string($speech['text'])
                || ! is_string($speech['reference'])
                || ! is_string($speech['path'])) {
                throw new RuntimeException("Invalid fixed TTS definition: {$speechKey}");
            }

            $definitions[$speechKey] = $speech;
        }

        $ordinals = (array) config('speech.assessment_item_cues.ordinals');
        foreach ((array) config('speech.assessment_item_cues.tasks') as $task => $definition) {
            if (! is_array($definition)
                || ! isset($definition['text'], $definition['reference'], $definition['path'])
                || ! is_string($definition['text'])
                || ! is_string($definition['reference'])
                || ! is_string($definition['path'])) {
                throw new RuntimeException("Invalid assessment TTS definition: {$task}");
            }

            foreach ($ordinals as $position => $ordinal) {
                if (! is_string($ordinal)) {
                    throw new RuntimeException("Invalid assessment TTS ordinal: {$position}");
                }

                $definitions["assessment-{$task}-item-{$position}"] = [
                    'text' => sprintf($definition['text'], $ordinal),
                    'reference' => $definition['reference'],
                    'path' => "{$definition['path']}/assessment-{$task}-item-{$position}.wav",
                ];
            }
        }

        return $definitions;
    }

    /** @return array{duration_ms: int} */
    private function wavMetadata(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException("Cannot open published TTS audio: {$path}");
        }

        try {
            $header = fread($handle, 12);
            if (strlen($header) !== 12
                || substr($header, 0, 4) !== 'RIFF'
                || substr($header, 8, 4) !== 'WAVE') {
                throw new RuntimeException("Published TTS audio is not a RIFF WAV: {$path}");
            }

            $format = null;
            $dataSize = null;
            while (! feof($handle)) {
                $chunkHeader = fread($handle, 8);
                if (strlen($chunkHeader) !== 8) {
                    break;
                }

                $chunkId = substr($chunkHeader, 0, 4);
                $chunkSize = unpack('Vsize', substr($chunkHeader, 4, 4))['size'];
                if ($chunkId === 'fmt ') {
                    $chunk = fread($handle, $chunkSize);
                    if (strlen($chunk) < 16) {
                        throw new RuntimeException("Published TTS WAV format is incomplete: {$path}");
                    }
                    $format = unpack(
                        'vaudio_format/vchannels/Vsample_rate/Vbyte_rate/vblock_align/vbits_per_sample',
                        substr($chunk, 0, 16),
                    );
                } elseif ($chunkId === 'data') {
                    $dataSize = $chunkSize;
                    fseek($handle, $chunkSize, SEEK_CUR);
                } else {
                    fseek($handle, $chunkSize, SEEK_CUR);
                }

                if ($chunkSize % 2 === 1) {
                    fseek($handle, 1, SEEK_CUR);
                }
            }

            if (! is_array($format)
                || $dataSize === null
                || $format['audio_format'] !== 1
                || $format['channels'] !== 1
                || $format['sample_rate'] !== 48000
                || $format['bits_per_sample'] !== 16
                || $format['byte_rate'] <= 0) {
                throw new RuntimeException("Published TTS WAV has an unsupported format: {$path}");
            }

            return [
                'duration_ms' => (int) round(($dataSize / $format['byte_rate']) * 1000),
            ];
        } finally {
            fclose($handle);
        }
    }
}
