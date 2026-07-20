<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\School;
use App\Models\StaffUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class TeacherLearnerTest extends TestCase
{
    public function test_teacher_creates_a_learner_with_generated_credentials_and_inherited_assignment(): void
    {
        $teacher = $this->createTeacher();

        $response = $this->postJson("/api/staff/teacher/{$teacher->id}/learners", [
            'first_name' => '  Dorothy  ',
            'middle_name' => '  Gale  ',
            'last_name' => '  Wright  ',
            'suffix' => '  Jr. ',
            'lrn' => '  123456789012  ',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('learner.learner_code', 'AA000')
            ->assertJsonPath('learner.full_name', 'Dorothy Gale Wright Jr.')
            ->assertJsonPath('learner.lrn', '123456789012')
            ->assertJsonPath('learner.grade_level', 1)
            ->assertJsonPath('learner.section', 'Maple');

        $temporaryPassword = $response->json('learner.temporary_password');

        $this->assertMatchesRegularExpression('/^(apple|orange|lemon)\d{3}$/', $temporaryPassword);

        $learner = Learner::query()->where('learner_code', 'AA000')->firstOrFail();

        $this->assertSame($teacher->school_id, $learner->school_id);
        $this->assertSame($teacher->id, $learner->teacher_id);
        $this->assertSame($teacher->grade_level, $learner->grade_level);
        $this->assertSame($teacher->section, $learner->section);
        $this->assertTrue(Hash::check($temporaryPassword, $learner->password));
        $this->assertNotSame($temporaryPassword, $learner->password);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $teacher->id,
            'action_key' => 'learner.created',
        ]);
    }

    public function test_learner_creation_rejects_every_missing_mandatory_name(): void
    {
        $teacher = $this->createTeacher();

        $this->postJson("/api/staff/teacher/{$teacher->id}/learners", [
            'first_name' => '',
            'middle_name' => ' ',
            'last_name' => '',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'middle_name', 'last_name']);

        $this->assertDatabaseCount('learners', 0);
        $this->assertDatabaseHas('learner_code_counters', [
            'id' => 1,
            'next_value' => 0,
        ]);
    }

    public function test_learner_codes_follow_the_required_global_sequence_boundaries(): void
    {
        $teacher = $this->createTeacher();

        DB::table('learner_code_counters')->where('id', 1)->update(['next_value' => 999]);
        $this->assertSame('AA999', $this->createLearner($teacher, 'First')->json('learner.learner_code'));
        $this->assertSame('BA000', $this->createLearner($teacher, 'Second')->json('learner.learner_code'));

        DB::table('learner_code_counters')->where('id', 1)->update(['next_value' => 25999]);
        $this->assertSame('ZA999', $this->createLearner($teacher, 'Third')->json('learner.learner_code'));
        $this->assertSame('AB000', $this->createLearner($teacher, 'Fourth')->json('learner.learner_code'));
    }

    public function test_teacher_directory_only_returns_their_assigned_learners(): void
    {
        $teacher = $this->createTeacher();
        $otherTeacher = StaffUser::query()->create([
            'username' => 'other-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $teacher->school_id,
            'grade_level' => 2,
            'section' => 'Rose',
            'display_name' => 'Teacher',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->createLearner($teacher, 'Assigned');
        $this->createLearner($otherTeacher, 'Other');

        $this->getJson("/api/staff/teacher/{$teacher->id}/learners")
            ->assertOk()
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.first_name', 'Assigned');
    }

    public function test_dashboard_totals_include_created_learners_in_the_correct_scope(): void
    {
        $teacher = $this->createTeacher();
        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-test',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $teacher->school_id,
            'display_name' => 'School Administrator',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);

        $this->createLearner($teacher, 'Assigned');

        $this->getJson("/api/staff/teacher/{$teacher->id}/overview")
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 1)
            ->assertJsonPath('metrics.diagnostic_pending', 1);

        $this->getJson("/api/staff/school-admin/{$schoolAdministrator->id}/overview")
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 1)
            ->assertJsonPath('metrics.active_learners', 1);

        $this->getJson('/api/staff/system-admin/overview')
            ->assertOk()
            ->assertJsonPath('metrics.total_learners', 1);
    }

    private function createTeacher(): StaffUser
    {
        $school = School::query()->create([
            'name' => 'Northfield Elementary School',
            'normalized_name' => 'northfield elementary school',
        ]);

        return StaffUser::query()->create([
            'username' => 'teacher-test',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'display_name' => 'Teacher',
            'is_active' => true,
            'requires_credential_setup' => true,
        ]);
    }

    private function createLearner(StaffUser $teacher, string $firstName): TestResponse
    {
        return $this->postJson("/api/staff/teacher/{$teacher->id}/learners", [
            'first_name' => $firstName,
            'middle_name' => 'Middle',
            'last_name' => 'Learner',
        ])->assertCreated();
    }
}
