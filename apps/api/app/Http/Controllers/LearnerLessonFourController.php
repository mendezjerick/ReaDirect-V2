<?php

namespace App\Http\Controllers;

use App\Services\LearnerAssessmentAsr;
use App\Services\LearnerSessionResolver;
use App\Services\LessonContentCatalog;
use App\Services\LessonFourSupportPresentation;
use App\Services\LessonPracticeTryService;
use App\Services\LessonTeachingStateMachine;
use App\Services\SpeechEquivalenceResolver;
use App\Services\TranscriptAlignmentService;

final class LearnerLessonFourController extends LearnerSpokenTextLessonController
{
    public function __construct(
        LearnerSessionResolver $sessions,
        LessonContentCatalog $content,
        LearnerAssessmentAsr $asr,
        SpeechEquivalenceResolver $equivalenceResolver,
        LessonTeachingStateMachine $teaching,
        LessonFourSupportPresentation $supportPresentation,
        TranscriptAlignmentService $transcriptAlignment,
        LessonPracticeTryService $practiceTries,
    ) {
        parent::__construct(
            $sessions,
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
        return 4;
    }

    protected function contentSnapshot(int $learnerId): array
    {
        return $this->content->lessonFourSnapshot($learnerId);
    }

    protected function missionTitle(): string
    {
        return 'Read the sentence';
    }

    protected function itemPresentation(): string
    {
        return 'display_sentence';
    }

    protected function resultSegmentLabel(): string
    {
        return 'Sentences';
    }

    protected function achievementKey(): string
    {
        return 'reading.sentence_star';
    }

    protected function achievementName(): string
    {
        return 'Sentence Star';
    }
}
