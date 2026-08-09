<?php

namespace App\Services;

use RuntimeException;

final class PublishedWavInspector
{
    /** @return array{duration_ms: int} */
    public function inspect(string $path): array
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
