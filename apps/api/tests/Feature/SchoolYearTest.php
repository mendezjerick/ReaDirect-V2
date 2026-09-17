<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\School;
use App\Models\SchoolYear;
use App\Models\StaffUser;
use Tests\TestCase;

final class SchoolYearTest extends TestCase
{
    public function test_school_setup_creates_the_initial_current_year(): void
    {
        $administrator = StaffUser::query()->create([
            'username' => 'school-year-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'display_name' => 'School Year Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);

        $this->postJson("/api/staff/school-admin/{$administrator->id}/school", [
            'school_name' => 'Year Boundary Elementary',
            'school_year' => '2025-2026',
        ])
            ->assertOk()
            ->assertJsonPath('staff.requires_school_setup', false);

        $school = School::query()->where('name', 'Year Boundary Elementary')->firstOrFail();
        $this->assertDatabaseHas('school_years', [
            'school_id' => $school->id,
            'label' => '2025-2026',
            'is_current' => true,
        ]);
    }

    public function test_staff_can_create_and_select_a_new_year_without_leaking_old_roster_rows(): void
    {
        $school = $this->school('Rollover Elementary');
        $current = SchoolYear::query()->where('school_id', $school->id)->where('label', '2025-2026')->firstOrFail();
        $next = SchoolYear::query()->create([
            'school_id' => $school->id,
            'label' => '2026-2027',
            'start_year' => 2026,
            'end_year' => 2027,
            'is_current' => false,
            'status' => SchoolYear::STATUS_PLANNED,
        ]);
        $administrator = StaffUser::query()->create([
            'username' => 'rollover-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $school->id,
            'display_name' => 'Rollover Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);

        $oldLearner = $this->learner('AA201', $school, $current);
        $newLearner = $this->learner('AA202', $school, $next);

        $this->getJson("/api/staff/school-admin/{$administrator->id}/learners")
            ->assertOk()
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.learner_code', $oldLearner->learner_code);

        $this->getJson("/api/staff/school-admin/{$administrator->id}/learners?school_year=2026-2027")
            ->assertOk()
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.learner_code', $newLearner->learner_code)
            ->assertJsonMissing(['learner_code' => $oldLearner->learner_code]);

        $this->getJson('/api/staff/school-years?school_year=2026-2027')
            ->assertOk()
            ->assertJsonPath('selected_school_year.label', '2026-2027')
            ->assertJsonPath('school_years.1.label', '2025-2026');
    }

    public function test_school_admin_creation_activates_the_new_year_and_closes_the_previous_one(): void
    {
        $school = $this->school('Activation Elementary');
        $administrator = StaffUser::query()->create([
            'username' => 'activation-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $school->id,
            'display_name' => 'Activation Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);

        $this->postJson('/api/staff/school-years', [
            'label' => '2026-2027',
        ])
            ->assertCreated()
            ->assertJsonPath('school_year.label', '2026-2027')
            ->assertJsonPath('school_year.is_current', true);

        $this->assertDatabaseHas('school_years', [
            'school_id' => $school->id,
            'label' => '2025-2026',
            'is_current' => false,
            'status' => SchoolYear::STATUS_CLOSED,
        ]);
        $this->assertDatabaseHas('staff_audit_logs', [
            'staff_user_id' => $administrator->id,
            'action_key' => 'school_year.created',
        ]);
    }

    public function test_staff_created_learner_is_assigned_to_the_selected_year(): void
    {
        $school = $this->school('New Roster Elementary');
        $next = $this->year($school, '2026-2027', false);
        $teacher = StaffUser::query()->create([
            'username' => 'new-roster-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 1,
            'section' => 'Maple',
            'display_name' => 'New Roster Teacher',
            'is_active' => true,
        ]);
        $this->authenticateStaff($teacher);

        $response = $this->postJson(
            "/api/staff/teacher/{$teacher->id}/learners?school_year=2026-2027",
            [
                'first_name' => 'New',
                'middle_name' => 'Roster',
                'last_name' => 'Learner',
            ],
        )->assertCreated();

        $this->assertDatabaseHas('learners', [
            'id' => $response->json('learner.id'),
            'school_id' => $school->id,
            'school_year_id' => $next->id,
        ]);
    }

    public function test_a_school_admin_cannot_select_another_schools_year(): void
    {
        $school = $this->school('Scoped Elementary');
        $otherSchool = $this->school('Other Elementary');
        $this->year($otherSchool, '2026-2027', false);
        $administrator = StaffUser::query()->create([
            'username' => 'scoped-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $school->id,
            'display_name' => 'Scoped Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);

        $this->getJson('/api/staff/school-years?school_year=2026-2027')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('school_year');
    }

    public function test_system_admin_can_select_a_global_year_label_for_directory_data(): void
    {
        $school = $this->school('Global Year Elementary');
        $current = SchoolYear::query()->where('school_id', $school->id)->firstOrFail();
        $next = $this->year($school, '2026-2027', false);
        $this->learner('AA203', $school, $current);
        $nextLearner = $this->learner('AA204', $school, $next);
        $systemAdministrator = StaffUser::query()->create([
            'username' => 'global-year-admin',
            'password' => 'temporary-pass',
            'role' => 'system_admin',
            'display_name' => 'Global Year Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($systemAdministrator);

        $this->getJson('/api/staff/school-years')
            ->assertOk()
            ->assertJsonPath('selected_school_year.label', '2025-2026')
            ->assertJsonCount(2, 'school_years');

        $this->getJson('/api/staff/system-admin/learners?school_year=2026-2027')
            ->assertOk()
            ->assertJsonCount(1, 'learners')
            ->assertJsonPath('learners.0.learner_code', $nextLearner->learner_code);
    }

    private function school(string $name): School
    {
        return School::query()->create([
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
        ]);
    }

    private function year(School $school, string $label, bool $current): SchoolYear
    {
        [$startYear, $endYear] = array_map('intval', explode('-', $label));

        return SchoolYear::query()->create([
            'school_id' => $school->id,
            'label' => $label,
            'start_year' => $startYear,
            'end_year' => $endYear,
            'is_current' => $current,
            'status' => $current ? SchoolYear::STATUS_CURRENT : SchoolYear::STATUS_PLANNED,
        ]);
    }

    private function learner(string $code, School $school, SchoolYear $year): Learner
    {
        return Learner::query()->create([
            'learner_code' => $code,
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'apple123',
            'first_name' => 'Year',
            'middle_name' => 'Boundary',
            'last_name' => $code,
            'school_id' => $school->id,
            'school_year_id' => $year->id,
            'grade_level' => 3,
            'section' => 'Maple',
            'is_active' => true,
        ]);
    }
}
