<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\StaffUser;
use Database\Seeders\DuhatProductionDatasetSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DuhatProductionDatasetSeederTest extends TestCase
{
    public function test_it_seeds_the_correct_duhat_hierarchy_and_completed_history_idempotently(): void
    {
        config()->set('hashing.bcrypt.rounds', 12);

        StaffUser::query()->create([
            'username' => 'system.admin',
            'password' => 'system-admin-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
            'requires_credential_setup' => false,
        ]);

        (new DuhatProductionDatasetSeeder)->run();
        (new DuhatProductionDatasetSeeder)->run();

        $school = DB::table('schools')
            ->where('normalized_name', 'duhat elementary school')
            ->first();

        $this->assertNotNull($school);
        $this->assertSame('Duhat Elementary School', $school->name);

        $administrator = StaffUser::query()->where('username', 'des.admin')->firstOrFail();
        $gradeOneTeacher = StaffUser::query()->where('username', 'g1.teacher')->firstOrFail();
        $gradeThreeTeacher = StaffUser::query()->where('username', 'g3.teacher')->firstOrFail();

        $this->assertSame('school_admin', $administrator->role);
        $this->assertSame('DES Admin', $administrator->display_name);
        $this->assertSame($school->id, $administrator->school_id);
        $this->assertTrue($administrator->requires_credential_setup);

        $this->assertSame('G1 Teacher', $gradeOneTeacher->display_name);
        $this->assertSame(1, $gradeOneTeacher->grade_level);
        $this->assertSame('Grade 1', $gradeOneTeacher->section);
        $this->assertSame($school->id, $gradeOneTeacher->school_id);

        $this->assertSame('G3 Teacher', $gradeThreeTeacher->display_name);
        $this->assertSame(3, $gradeThreeTeacher->grade_level);
        $this->assertSame('Grade 3', $gradeThreeTeacher->section);
        $this->assertSame($school->id, $gradeThreeTeacher->school_id);

        $this->assertSame(10, Learner::query()->where('teacher_id', $gradeOneTeacher->id)->count());
        $this->assertSame(10, Learner::query()->where('teacher_id', $gradeThreeTeacher->id)->count());
        $this->assertSame(
            range(1, 10),
            Learner::query()
                ->where('teacher_id', $gradeOneTeacher->id)
                ->orderBy('learner_code')
                ->pluck('learner_code')
                ->map(fn (string $code): int => (int) substr($code, 2))
                ->all(),
        );
        $this->assertSame(
            range(11, 20),
            Learner::query()
                ->where('teacher_id', $gradeThreeTeacher->id)
                ->orderBy('learner_code')
                ->pluck('learner_code')
                ->map(fn (string $code): int => (int) substr($code, 2))
                ->all(),
        );
        $this->assertFalse(Learner::query()->whereIn('learner_code', ['AA000', 'AA021'])->exists());

        $this->assertSame(20, DB::table('learner_progress_states')->count());
        $this->assertSame(20, DB::table('learner_progress_states')
            ->where('stage', 'reading_journey_complete')
            ->count());
        $this->assertSame(40, DB::table('assessment_runs')->count());
        $this->assertSame(200, DB::table('assessment_responses')->count());
        $this->assertSame(120, DB::table('lesson_runs')->count());
        $this->assertSame(120, DB::table('lesson_responses')->count());
        $this->assertSame(274, DB::table('lesson_item_attempts')->count());
        $this->assertSame(160, DB::table('learner_achievements')->count());

        $this->assertSame(6, DB::table('staff_audit_logs')->count());
        $this->assertSame(2, DB::table('staff_audit_logs')
            ->where('action_key', 'learner.imported')
            ->count());
        $this->assertDatabaseHas('system_settings', [
            'key' => 'seed.duhat-production-v1.completed',
        ]);
    }
}
