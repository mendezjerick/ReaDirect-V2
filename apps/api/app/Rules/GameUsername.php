<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class GameUsername implements ValidationRule
{
    /**
     * These values are reserved only when the complete normalized username
     * matches. Substrings such as "clara123" remain valid.
     *
     * @var list<string>
     */
    private const RESERVED_NAMES = [
        'admin',
        'teacher',
        'system',
        'readirect',
        'clara',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match('/\A[A-Za-z0-9]{3,10}\z/D', $value) !== 1) {
            $fail('The game username must be 3 to 10 letters and numbers only.');

            return;
        }

        if (in_array(self::normalize($value), self::RESERVED_NAMES, true)) {
            $fail('That game username is reserved.');
        }
    }

    public static function normalize(string $username): string
    {
        return strtolower($username);
    }
}
