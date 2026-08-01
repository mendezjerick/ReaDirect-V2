<?php

namespace App\Services;

final class LessonFourSupportPresentation extends SpokenTextLessonSupportPresentation
{
    public function __construct(LearnerSpeechPolicy $speechPolicy)
    {
        parent::__construct(4, 'lesson-v1-sentence-', $speechPolicy);
    }
}
