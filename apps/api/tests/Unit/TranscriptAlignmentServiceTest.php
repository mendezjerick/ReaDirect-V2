<?php

namespace Tests\Unit;

use App\Services\TranscriptAlignmentService;
use PHPUnit\Framework\TestCase;

final class TranscriptAlignmentServiceTest extends TestCase
{
    private TranscriptAlignmentService $alignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->alignment = new TranscriptAlignmentService;
    }

    public function test_it_finds_a_missing_word_between_repeated_words(): void
    {
        $result = $this->alignment->analyze(
            'a cat on a mat',
            'a on a mat',
        );

        $this->assertSame('missing_word', $result['diagnosis_key']);
        $this->assertSame(1, $result['distance']);
        $this->assertSame('delete', $result['primary_operation']['type']);
        $this->assertSame('cat', $result['primary_operation']['expected']);
        $this->assertSame(1, $result['primary_operation']['expected_index']);
    }

    public function test_it_finds_an_extra_word(): void
    {
        $result = $this->alignment->analyze(
            'a cat on a mat',
            'a big cat on a mat',
        );

        $this->assertSame('extra_word', $result['diagnosis_key']);
        $this->assertSame('insert', $result['primary_operation']['type']);
        $this->assertSame('big', $result['primary_operation']['actual']);
    }

    public function test_it_finds_a_replaced_word_and_character_distance(): void
    {
        $result = $this->alignment->analyze(
            'a cat on a mat',
            'a cap on a mat',
        );

        $this->assertSame('replaced_word', $result['diagnosis_key']);
        $this->assertSame('cat', $result['primary_operation']['expected']);
        $this->assertSame('cap', $result['primary_operation']['actual']);
        $this->assertSame(
            1,
            $result['primary_operation']['character_distance'],
        );
    }

    public function test_it_finds_adjacent_words_that_changed_places(): void
    {
        $result = $this->alignment->analyze(
            'a cat on a mat',
            'a on cat a mat',
        );

        $this->assertSame('words_out_of_order', $result['diagnosis_key']);
        $this->assertSame('transpose', $result['primary_operation']['type']);
        $this->assertSame('cat', $result['primary_operation']['expected_first']);
        $this->assertSame('on', $result['primary_operation']['expected_second']);
    }

    public function test_it_reduces_multiple_errors_to_one_primary_operation(): void
    {
        $result = $this->alignment->analyze(
            'a cat on a mat',
            'dog by mat',
        );

        $this->assertSame(
            'multiple_word_differences',
            $result['diagnosis_key'],
        );
        $this->assertGreaterThan(1, $result['distance']);
        $this->assertNotEmpty($result['primary_operation']);
    }

    public function test_it_normalizes_case_and_punctuation_before_alignment(): void
    {
        $result = $this->alignment->analyze(
            'A cat on a mat.',
            'a CAT on a mat',
        );

        $this->assertSame('correct_phrase', $result['diagnosis_key']);
        $this->assertSame(0, $result['distance']);
        $this->assertSame([], $result['operations']);
    }
}
