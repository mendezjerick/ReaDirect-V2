<?php

declare(strict_types=1);

namespace App\Support;

final class SpeechLanguage
{
    public const ENGLISH = 'en';

    public const FILIPINO = 'fil-PH';

    /** @return list<string> */
    public static function codes(): array
    {
        return [self::ENGLISH, self::FILIPINO];
    }

    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            self::ENGLISH => 'English',
            self::FILIPINO => 'Filipino',
        ];
    }

    public static function normalize(?string $language): string
    {
        return in_array($language, self::codes(), true)
            ? $language
            : self::ENGLISH;
    }
}
