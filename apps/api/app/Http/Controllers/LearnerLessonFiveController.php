<?php

namespace App\Http\Controllers;

use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Services\LearnerAssessmentAsr;
use App\Services\LearnerLessonAccessService;
use App\Services\LearnerLessonCompletionService;
use App\Services\LearnerSessionResolver;
use App\Services\LessonContentCatalog;
use App\Services\LessonFiveSupportPresentation;
use App\Services\LessonPracticeTryService;
use App\Services\LessonTeachingStateMachine;
use App\Services\PassageReadingResultService;
use App\Services\SpeechEquivalenceResolver;
use App\Services\TranscriptAlignmentService;
use Illuminate\Http\UploadedFile;

final class LearnerLessonFiveController extends LearnerSpokenTextLessonController
{
    public function __construct(
        LearnerSessionResolver $sessions,
        LearnerLessonAccessService $lessonAccess,
        LearnerLessonCompletionService $lessonCompletion,
        LessonContentCatalog $content,
        LearnerAssessmentAsr $asr,
        SpeechEquivalenceResolver $equivalenceResolver,
        LessonTeachingStateMachine $teaching,
        LessonFiveSupportPresentation $supportPresentation,
        TranscriptAlignmentService $transcriptAlignment,
        LessonPracticeTryService $practiceTries,
        private readonly PassageReadingResultService $passageResults,
    ) {
        parent::__construct(
            $sessions,
            $lessonAccess,
            $lessonCompletion,
            $content,
            $asr,
            $equivalenceResolver,
            $teaching,
            $supportPresentation,
            $transcriptAlignment,
            $practiceTries,
        );
    }

    protected function lessonNumber(): int
    {
        return 5;
    }

    protected function contentSnapshot(int $learnerId): array
    {
        return $this->content->lessonFiveSnapshot($learnerId);
    }

    protected function missionTitle(): string
    {
        return 'Read the passage';
    }

    protected function itemPresentation(): string
    {
        return 'display_passage';
    }

    protected function resultSegmentLabel(): string
    {
        return 'Passage';
    }

    protected function achievementKey(): string
    {
        return 'reading.passage_explorer';
    }

    protected function achievementName(): string
    {
        return 'Passage Explorer';
    }

    protected function requiresReview(): bool
    {
        return true;
    }

    protected function autoAdvanceTerminalSubmission(): bool
    {
        return true;
    }

    /**
     * @param  array<string, mixed>  $state
     * @return array<string, mixed>
     */
    protected function recordEvidenceState(
        array $state,
        string $classification,
        ?string $diagnosisKey,
    ): array {
        if (in_array($classification, [
            LessonTeachingStateMachine::CLASS_UNCERTAIN,
            LessonTeachingStateMachine::CLASS_UNUSABLE_AUDIO,
            LessonTeachingStateMachine::CLASS_SILENCE,
        ], true)) {
            return $this->teaching->recordEvidence(
                $state,
                $classification,
                $diagnosisKey,
            );
        }

        $correct = $classification === LessonTeachingStateMachine::CLASS_CLEAR_CORRECT;

        return [
            ...$state,
            'teaching_state' => LessonTeachingStateMachine::STATE_REVIEW_SCHEDULED,
            'outcome' => $correct
                ? LessonTeachingStateMachine::OUTCOME_INDEPENDENT_CORRECT
                : LessonTeachingStateMachine::OUTCOME_NOT_YET_CORRECT,
            'academic_attempt_count' => 1,
            'diagnosis_key' => $diagnosisKey,
            'independent_mastery' => $correct,
            'review_recommended' => ! $correct,
            'terminal' => true,
        ];
    }

    /** @param array<string, string> $item
     * @return array<string, mixed>
     */
    protected function transcribe(UploadedFile $audio, array $item): array
    {
        return $this->asr->passage($audio, $item['spoken_target']);
    }

    /**
     * @param  array<string, mixed>  $evidence
     * @param  array<string, mixed>  $resolution
     * @return array<string, mixed>
     */
    protected function enrichEvidence(
        array $evidence,
        array $resolution,
    ): array {
        $incorrectWords = min(50, collect($resolution['differences'] ?? [])
            ->filter(fn (array $difference): bool => ($difference['expected'] ?? '') !== ''
                && ! in_array(
                    $difference['status'] ?? '',
                    ['match', 'equivalent'],
                    true,
                )
            )->count());
        $accuracy = max(0, 100 - ($incorrectWords * 2));

        return [
            ...$evidence,
            'scoring' => [
                'incorrect_words' => $incorrectWords,
                'reading_accuracy_percent' => $accuracy,
                'expected_word_count' => $resolution['expected_word_count'] ?? 50,
                ...$this->passageResults->metrics(
                    $evidence,
                    $resolution,
                    $incorrectWords,
                ),
            ],
        ];
    }

    /** @param array<string, string> $item
     * @return array<string, mixed>
     */
    protected function itemPayload(LessonRun $run, array $item): array
    {
        return [
            'item_key' => $item['content_id'],
            'presentation' => $this->itemPresentation(),
            'title' => $item['title'],
            'display_text' => $item['display_text'],
            'authored_pages' => json_decode(
                $item['authored_pages'],
                true,
                flags: JSON_THROW_ON_ERROR,
            ),
            'time_limit_seconds' => 60,
        ];
    }

    /** @return array<string, mixed>|null */
    protected function passageReview(LessonRun $run): ?array
    {
        if (! in_array(
            $run->status,
            [LessonRun::STATUS_REVIEW, LessonRun::STATUS_COMPLETED],
            true,
        )) {
            return null;
        }

        $passage = data_get($run->content_snapshot, 'mission-1.0');
        if (! is_array($passage)) {
            return null;
        }
        $response = LessonResponse::query()
            ->where('lesson_run_id', $run->id)
            ->where('mission_key', 'mission-1')
            ->where('item_key', $passage['content_id'])
            ->first();

        return $this->passageResults->review(
            $passage,
            $response?->evidence,
            $response?->response_type,
        );
    }

    protected function masteryScore(iterable $responses): int
    {
        return collect($responses)->contains(
            fn (LessonResponse $response): bool => $response->response_type === 'speech',
        ) ? 1 : 0;
    }
}
