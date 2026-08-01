<?php

namespace App\Services;

final class LessonThreeSupportPresentation extends SpokenTextLessonSupportPresentation
{
    public function __construct(LearnerSpeechPolicy $speechPolicy)
    {
        parent::__construct(3, 'lesson-v1-phrase-', $speechPolicy);
    }
}
