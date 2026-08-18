<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

final class LearnerCodeGenerator
{
    private const MAX_SEQUENCE_VALUE = 675999;

    private const RESERVED_CODES = ['KW000'];

    public function next(): string
    {
        $counter = DB::table('learner_code_counters')
            ->where('id', 1)
            ->lockForUpdate()
            ->first();

        if ($counter === null) {
            throw new RuntimeException('The learner code counter is not initialized.');
        }

        $value = (int) $counter->next_value;

        do {
            if ($value > self::MAX_SEQUENCE_VALUE) {
                throw new RuntimeException('The learner code sequence is exhausted.');
            }

            $code = $this->format($value);
            $value++;
        } while (
            in_array($code, self::RESERVED_CODES, true)
            || DB::table('learners')->where('learner_code', $code)->exists()
        );

        DB::table('learner_code_counters')
            ->where('id', 1)
            ->update(['next_value' => $value]);

        return $code;
    }

    private function format(int $value): string
    {
        $number = $value % 1000;
        $letterIndex = intdiv($value, 1000);
        $firstLetter = chr(ord('A') + ($letterIndex % 26));
        $secondLetter = chr(ord('A') + intdiv($letterIndex, 26));

        return $firstLetter.$secondLetter.str_pad((string) $number, 3, '0', STR_PAD_LEFT);
    }
}
