<?php

namespace Database\Seeders;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use Illuminate\Database\Seeder;

final class PortalSystemLearnerSeeder extends Seeder
{
    public function run(): void
    {
        $learner = Learner::query()->updateOrCreate(
            ['learner_code' => 'KW000'],
            [
                'account_purpose' => Learner::PURPOSE_PORTAL_SYSTEM,
                'password' => 'rhine359',
                'first_name' => 'Kristen',
                'middle_name' => 'Rhine',
                'last_name' => 'Wright',
                'suffix' => null,
                'lrn' => null,
                'school_id' => null,
                'teacher_id' => null,
                'grade_level' => null,
                'section' => null,
                'is_active' => true,
            ],
        );

        LearnerProgressState::query()->firstOrCreate(
            ['learner_id' => $learner->id],
            ['stage' => LearnerProgressState::BASELINE_STAGE],
        );
    }
}
