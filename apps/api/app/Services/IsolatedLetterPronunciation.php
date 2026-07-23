<?php

namespace App\Services;

final class IsolatedLetterPronunciation
{
    public const MAP = [
        'A' => 'ei', 'B' => 'bee', 'C' => 'see', 'D' => 'dee', 'E' => 'ee', 'F' => 'eff', 'G' => 'gee',
        'H' => 'aitch', 'I' => 'eye', 'J' => 'jay', 'K' => 'kei', 'L' => 'el', 'M' => 'em', 'N' => 'en',
        'O' => 'oh', 'P' => 'pee', 'Q' => 'cue', 'R' => 'ar', 'S' => 'ess', 'T' => 'tee', 'U' => 'you',
        'V' => 'vee', 'W' => 'double you', 'X' => 'ex', 'Y' => 'why', 'Z' => 'zee',
    ];

    public function spokenForm(string $canonicalLetter): string
    {
        return self::MAP[strtoupper(trim($canonicalLetter))] ?? 'that sound';
    }

    /** @return array<string, string> */
    public static function all(): array
    {
        return self::MAP;
    }
}
