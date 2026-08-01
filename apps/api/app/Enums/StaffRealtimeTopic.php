<?php

namespace App\Enums;

enum StaffRealtimeTopic: string
{
    case Overview = 'overview';
    case SchoolAdministrators = 'school-administrators';
    case Schools = 'schools';
    case SchoolProfile = 'school-profile';
    case Classes = 'classes';
    case Teachers = 'teachers';
    case Learners = 'learners';
    case LearnerDetail = 'learner-detail';
    case Analytics = 'analytics';
    case Reports = 'reports';
    case InstructionalInsights = 'instructional-insights';
    case AudioReviews = 'audio-reviews';
    case AssessmentReviews = 'assessment-reviews';
    case Operations = 'operations';
}
