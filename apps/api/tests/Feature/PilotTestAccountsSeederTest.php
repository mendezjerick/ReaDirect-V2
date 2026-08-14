<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Database\Seeders\PilotTestAccountsSeeder;
use Tests\TestCase;

final class PilotTestAccountsSeederTest extends TestCase
{
    public function test_it_seeds_an_idempotent_pilot_school_with_staff_and_ten_readers(): void
    {
        (new PilotTestAccountsSeeder)->run();
        (new PilotTestAccountsSeeder)->run();

        $school = School::query()
            ->where('normalized_name', 'readirect pilot evaluation school')
            ->sole();

        $this->assertSame(1, School::query()->count());
        $this->assertSame(1, StaffUser::query()
            ->where('school_id', $school->id)
            ->where('role', 'school_admin')
            ->count());
        $this->assertSame(2, StaffUser::query()
            ->where('school_id', $school->id)
            ->where('role', 'teacher')
            ->count());
        $this->assertSame(10, Learner::query()
            ->where('school_id', $school->id)
            ->whereBetween('learner_code', ['IT001', 'IT010'])
            ->count());
        $this->assertSame(10, LearnerProgressState::query()->count());

        foreach (Learner::query()->get() as $learner) {
            $this->assertSame(Learner::PURPOSE_STANDARD, $learner->account_purpose);
            $this->assertSame('en', $learner->speech_language);
            $this->assertSame(3, $learner->grade_level);
            $this->assertTrue($learner->is_active);
            $this->assertStringStartsWith('$2y$12$', $learner->getRawOriginal('password'));
            $this->assertNotNull($learner->teacher);
        }
    }
}
