<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Support\SpeechLanguage;
use Illuminate\Support\Facades\Storage;

final class OfflinePracticeAssetResolver
{
    /** @return array{bytes: string, mimeType: string, byteCount: int, sha256: string}|null */
    public function fixedClaraAudio(string $language, string $speechKey, string $expectedText): ?array
    {
        $languageCode = match ($language) {
            'en' => SpeechLanguage::ENGLISH,
            'fil' => SpeechLanguage::FILIPINO,
            default => null,
        };
        if ($languageCode === null || ! $this->isSafeSpeechKey($speechKey)) {
            return null;
        }

        $voice = TtsVoiceVersion::query()
            ->where('language_code', $languageCode)
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->first();
        if ($voice === null) {
            return null;
        }

        $line = TtsSpeechLine::query()
            ->where('tts_voice_version_id', $voice->id)
            ->where('speech_key', $speechKey)
            ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
            ->first();
        if ($line === null || $line->text !== $expectedText) {
            return null;
        }
        if (! is_string($line->audio_storage_disk)
            || ! is_string($line->audio_storage_path)
            || ! $this->isSafeAudioPath($line->audio_storage_path)
            || ! is_string($line->audio_sha256)
            || preg_match('/^[a-f0-9]{64}$/', $line->audio_sha256) !== 1) {
            return null;
        }

        $disk = Storage::disk($line->audio_storage_disk);
        if (! $disk->exists($line->audio_storage_path)) {
            return null;
        }
        try {
            $storedByteCount = $disk->size($line->audio_storage_path);
        } catch (\Throwable) {
            return null;
        }
        if ($storedByteCount <= 0
            || $storedByteCount > (int) config('offline_practice.limits.max_single_asset_bytes')) {
            return null;
        }

        $bytes = $disk->get($line->audio_storage_path);
        if (! is_string($bytes)) {
            return null;
        }
        $byteCount = strlen($bytes);
        if ($byteCount === 0
            || $byteCount !== $storedByteCount
            || $byteCount > (int) config('offline_practice.limits.max_single_asset_bytes')
            || ! $this->isRiffWave($bytes)
            || ! hash_equals($line->audio_sha256, hash('sha256', $bytes))) {
            return null;
        }

        return [
            'bytes' => $bytes,
            'mimeType' => 'audio/wav',
            'byteCount' => $byteCount,
            'sha256' => hash('sha256', $bytes),
        ];
    }

    private function isSafeSpeechKey(string $value): bool
    {
        return mb_strlen($value) <= 120
            && preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $value) === 1
            && ! str_contains($value, '..');
    }

    private function isSafeAudioPath(string $value): bool
    {
        if ($value === '' || mb_strlen($value) > 500 || str_contains($value, '\\')
            || str_contains($value, '%') || str_contains($value, '..')
            || preg_match('/[\x00-\x1F\x7F]/', $value) === 1
            || ! str_ends_with(strtolower($value), '.wav')) {
            return false;
        }
        $parts = explode('/', $value);

        return $parts !== [] && array_reduce(
            $parts,
            fn (bool $safe, string $part): bool => $safe
                && preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $part) === 1,
            true,
        );
    }

    private function isRiffWave(string $bytes): bool
    {
        return strlen($bytes) >= 12
            && substr($bytes, 0, 4) === 'RIFF'
            && substr($bytes, 8, 4) === 'WAVE';
    }
}
