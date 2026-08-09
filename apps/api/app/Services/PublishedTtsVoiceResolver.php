<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\TtsVoiceVersion;

final class PublishedTtsVoiceResolver
{
    public function forLanguage(string $language): ?TtsVoiceVersion
    {
        return TtsVoiceVersion::query()
            ->where('language_code', $language)
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->first();
    }

    public function existsForLanguage(string $language): bool
    {
        return TtsVoiceVersion::query()
            ->where('language_code', $language)
            ->where('status', TtsVoiceVersion::STATUS_PUBLISHED)
            ->exists();
    }
}
