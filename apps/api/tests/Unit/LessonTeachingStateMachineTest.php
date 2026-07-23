<?php

namespace Tests\Unit;

use App\Services\LessonTeachingStateMachine;
use DomainException;
use PHPUnit\Framework\TestCase;

final class LessonTeachingStateMachineTest extends TestCase
{
    private LessonTeachingStateMachine $machine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->machine = new LessonTeachingStateMachine;
    }

    public function test_independent_correct_is_terminal_mastery(): void
    {
        $state = $this->machine->recordEvidence(
            $this->machine->initial(),
            LessonTeachingStateMachine::CLASS_CLEAR_CORRECT,
            'correct_letter',
        );

        $this->assertSame(LessonTeachingStateMachine::OUTCOME_INDEPENDENT_CORRECT, $state['outcome']);
        $this->assertSame(1, $state['academic_attempt_count']);
        $this->assertSame(0, $state['technical_retry_count']);
        $this->assertTrue($state['independent_mastery']);
        $this->assertTrue($this->machine->canAdvance($state));
    }

    public function test_one_clue_leads_to_supported_correct_without_independent_mastery(): void
    {
        $state = $this->machine->recordEvidence(
            $this->machine->initial(),
            LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT,
            'different_clear_letter',
        );
        $this->assertSame(LessonTeachingStateMachine::STATE_GIVING_CLUE, $state['teaching_state']);

        $state = $this->machine->continueSupport($state);
        $this->assertSame(LessonTeachingStateMachine::STATE_GUIDED_RETRY, $state['teaching_state']);

        $state = $this->machine->recordEvidence(
            $state,
            LessonTeachingStateMachine::CLASS_CLEAR_CORRECT,
            'correct_letter',
        );
        $this->assertSame(LessonTeachingStateMachine::OUTCOME_SUPPORTED_CORRECT, $state['outcome']);
        $this->assertSame(2, $state['academic_attempt_count']);
        $this->assertSame(LessonTeachingStateMachine::SCAFFOLD_TARGETED_CLUE, $state['highest_scaffold_used']);
        $this->assertFalse($state['independent_mastery']);
        $this->assertTrue($state['review_recommended']);
    }

    public function test_demonstration_and_echo_never_become_independent_mastery(): void
    {
        $state = $this->machine->recordEvidence(
            $this->machine->initial(),
            LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT,
            'different_clear_letter',
        );
        $state = $this->machine->continueSupport($state);
        $state = $this->machine->recordEvidence(
            $state,
            LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT,
            'different_clear_letter',
        );
        $this->assertSame(LessonTeachingStateMachine::STATE_DEMONSTRATING, $state['teaching_state']);

        $state = $this->machine->continueSupport($state);
        $this->assertSame(LessonTeachingStateMachine::STATE_ECHO_RETRY, $state['teaching_state']);

        $state = $this->machine->recordEvidence(
            $state,
            LessonTeachingStateMachine::CLASS_CLEAR_CORRECT,
            'correct_letter',
        );
        $this->assertSame(LessonTeachingStateMachine::OUTCOME_DEMONSTRATED, $state['outcome']);
        $this->assertSame(2, $state['academic_attempt_count']);
        $this->assertSame(LessonTeachingStateMachine::SCAFFOLD_ECHO, $state['highest_scaffold_used']);
        $this->assertFalse($state['independent_mastery']);
        $this->assertTrue($state['review_recommended']);
    }

    public function test_two_unusable_recordings_are_unscorable_without_academic_attempts(): void
    {
        $state = $this->machine->recordEvidence(
            $this->machine->initial(),
            LessonTeachingStateMachine::CLASS_UNUSABLE_AUDIO,
            'unusable_audio',
        );
        $this->assertSame(LessonTeachingStateMachine::STATE_LISTENING, $state['teaching_state']);
        $this->assertSame(0, $state['academic_attempt_count']);

        $state = $this->machine->recordEvidence(
            $state,
            LessonTeachingStateMachine::CLASS_UNUSABLE_AUDIO,
            'unusable_audio',
        );
        $this->assertSame(LessonTeachingStateMachine::OUTCOME_UNSCORABLE_AUDIO, $state['outcome']);
        $this->assertSame(0, $state['academic_attempt_count']);
        $this->assertSame(2, $state['technical_retry_count']);
        $this->assertFalse($state['review_recommended']);
    }

    public function test_terminal_items_reject_more_evidence(): void
    {
        $state = $this->machine->recordEvidence(
            $this->machine->initial(),
            LessonTeachingStateMachine::CLASS_CLEAR_CORRECT,
            'correct_letter',
        );

        $this->expectException(DomainException::class);
        $this->machine->recordEvidence(
            $state,
            LessonTeachingStateMachine::CLASS_CLEAR_CORRECT,
            'correct_letter',
        );
    }
}
