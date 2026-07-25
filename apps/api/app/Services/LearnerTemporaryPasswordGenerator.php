<?php

namespace App\Services;

final class LearnerTemporaryPasswordGenerator
{
    public function generate(): string
    {
        $fruits = ['apple', 'orange', 'lemon'];
        $fruit = $fruits[random_int(0, count($fruits) - 1)];
        $number = str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);

        return $fruit.$number;
    }
}
