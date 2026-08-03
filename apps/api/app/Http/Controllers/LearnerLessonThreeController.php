<?php

namespace App\Http\Controllers;

use App\Services\LearnerAssessmentAsr;
use App\Services\LearnerLessonAccessService;
use App\Services\LearnerLessonCompletionService;
use App\Services\LearnerSessionResolver;
use App\Services\LessonContentCatalog;
use App\Services\LessonPracticeTryService;
use App\Services\LessonTeachingStateMachine;
use App\Services\LessonThreeSupportPresentation;
use App\Services\SpeechEquivalenceResolver;
use App\Services\TranscriptAlignmentService;

final class LearnerLessonThreeController extends LearnerSpokenTextLessonController
{
    public function __construct(
        LearnerSessionResolver $sessions,
        LearnerLessonAccessService $lessonAccess,
        LearnerLessonCompletionService $lessonCompletion,
        LessonContentCatalog $content,
        LearnerAssessmentAsr $asr,
        SpeechEquivalenceResolver $equivalenceResolver,
        LessonTeachingStateMachine $teaching,
        LessonThreeSupportPresentation $supportPresentation,
        TranscriptAlignmentService $transcriptAlignment,
        LessonPracticeTryService $practiceTries,
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
        return 3;
    }

    protected function contentSnapshot(int $learnerId): array
    {
        return $this->content->lessonThreeSnapshot($learnerId);
    }

    protected function missionTitle(): string
    {
        return 'Read the phrase';
    }

    protected function itemPresentation(): string
    {
        return 'display_phrase';
    }

    protected function resultSegmentLabel(): string
    {
        return 'Phrases';
    }

    protected function achievementKey(): string
    {
        return 'reading.phrase_pro';
    }

    protected function achievementName(): string
    {
        return 'Phrase Pro';
    }
}
