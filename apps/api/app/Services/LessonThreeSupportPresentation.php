<?php

namespace App\Services;

final class LessonThreeSupportPresentation extends SpokenTextLessonSupportPresentation
{
    public function __construct()
    {
        parent::__construct(3, 'lesson-v1-phrase-');
    }
}
