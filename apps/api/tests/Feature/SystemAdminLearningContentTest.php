<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\StaffUser;
use Tests\TestCase;

final class SystemAdminLearningContentTest extends TestCase
{
    public function test_system_administrator_can_review_published_assessment_catalog_health(): void
    {
        $this->authenticateStaff($this->systemAdministrator());

        $this->getJson('/api/staff/system-admin/learning-content/assessments')
            ->assertOk()
            ->assertJsonPath('summary.version', 'v1')
            ->assertJsonPath('summary.active_items', 42)
            ->assertJsonPath('summary.ready_tasks', 5)
            ->assertJsonPath('summary.total_tasks', 5)
            ->assertJsonPath('summary.publication_state', 'Published')
            ->assertJsonPath('tasks.0.key', 'task-1a')
            ->assertJsonPath('tasks.0.active_items', 10)
            ->assertJsonPath('tasks.3.key', 'task-3a')
            ->assertJsonPath('tasks.3.active_items', 2)
            ->assertJsonPath('governance.read_only', true);
    }

    public function test_system_administrator_can_review_lesson_pool_readiness_without_creating_exposures(): void
    {
        $this->authenticateStaff($this->systemAdministrator());

        $this->getJson('/api/staff/system-admin/learning-content/lessons')
            ->assertOk()
            ->assertJsonPath('summary.version', 'v1')
            ->assertJsonPath('summary.active_items', 130)
            ->assertJsonPath('summary.ready_lessons', 6)
            ->assertJsonPath('summary.total_lessons', 6)
            ->assertJsonPath('lessons.0.active_items', 26)
            ->assertJsonPath('lessons.0.session_items', 15)
            ->assertJsonPath('lessons.5.selection', 'One Who, What, Where, When, and Why item')
            ->assertJsonPath('governance.read_only', true);

        $this->assertDatabaseCount('lesson_target_exposures', 0);
    }

    public function test_system_administrator_can_review_current_scoring_and_delivery_rules(): void
    {
        $this->authenticateStaff($this->systemAdministrator());

        $this->getJson('/api/staff/system-admin/learning-content/rules')
            ->assertOk()
            ->assertJsonPath('part_one.maximum_score', 30)
            ->assertJsonPath('part_one.bands.2.label', 'Light Refresher')
            ->assertJsonPath('part_one.bands.2.minimum', 17)
            ->assertJsonPath('part_one.bands.2.maximum', 26)
            ->assertJsonPath('final_reading.comprehension_weight_percent', 60)
            ->assertJsonPath('final_reading.reading_accuracy_weight_percent', 40)
            ->assertJsonPath('final_reading.bands.4.minimum', 91)
            ->assertJsonCount(4, 'delivery_guards')
            ->assertJsonPath('governance.read_only', true);
    }

    public function test_learning_content_governance_is_restricted_to_system_administrators(): void
    {
        $schoolAdministrator = StaffUser::query()->create([
            'username' => 'school-admin-content-test',
            'password' => 'local-password',
            'role' => 'school_admin',
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($schoolAdministrator);

        $this->getJson('/api/staff/system-admin/learning-content/assessments')->assertForbidden();
        $this->getJson('/api/staff/system-admin/learning-content/lessons')->assertForbidden();
        $this->getJson('/api/staff/system-admin/learning-content/rules')->assertForbidden();
    }

    private function systemAdministrator(): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'system-admin-content-test',
            'password' => 'local-password',
            'role' => 'system_admin',
            'display_name' => 'System Administrator',
            'is_active' => true,
        ]);
    }
}
