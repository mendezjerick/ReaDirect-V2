<?php

namespace Tests\Feature;

use App\Enums\StaffRealtimeTopic;
use App\Events\StaffDataChanged;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonRun;
use App\Models\School;
use App\Models\StaffUser;
use App\Services\LearnerDiagnosticSkipService;
use App\Services\LearnerLessonCompletionService;
use App\Services\StaffRealtimePublisher;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\TestCase;

final class StaffRealtimeDomainEventsTest extends TestCase
{
    public function test_domain_event_has_a_safe_versioned_after_commit_contract(): void
    {
        $eventId = (string) Str::uuid();
        $occurredAt = now()->toIso8601String();
        $event = new StaffDataChanged(
            ['staff.system', 'schools.7'],
            ['overview', 'learners'],
            $eventId,
            $occurredAt,
        );

        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event);
        $this->assertSame('database', $event->connection);
        $this->assertSame('broadcasts', $event->broadcastQueue);
        $this->assertSame('staff.data.changed', $event->broadcastAs());
        $this->assertSame(
            ['private-staff.system', 'private-schools.7'],
            array_map(
                static fn ($channel): string => $channel->name,
                $event->broadcastOn(),
            ),
        );
        $this->assertSame([
            'version' => 1,
            'event_id' => $eventId,
            'topics' => ['overview', 'learners'],
            'occurred_at' => $occurredAt,
        ], $event->broadcastWith());
    }

    public function test_learner_publication_fans_out_to_each_authorized_scope_as_one_job(): void
    {
        $school = $this->school();
        $teacher = $this->teacher($school);
        $learner = $this->learner($school, $teacher);

        app(StaffRealtimePublisher::class)->learner(
            $learner,
            StaffRealtimeTopic::Overview,
            StaffRealtimeTopic::Learners,
            StaffRealtimeTopic::Overview,
        );

        $this->assertDatabaseCount('jobs', 1);
        $this->assertDatabaseHas('jobs', ['queue' => 'broadcasts']);
    }

    public function test_progress_milestone_publishes_scoped_refresh_topics(): void
    {
        Event::fake([StaffDataChanged::class]);
        $school = $this->school();
        $teacher = $this->teacher($school);
        $learner = $this->learner($school, $teacher);

        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 2,
            'last_confirmed_at' => now(),
        ]);

        Event::assertDispatched(
            StaffDataChanged::class,
            fn (StaffDataChanged $event): bool => $event->channelNames === [
                'staff.system',
                "teachers.{$teacher->id}",
                "schools.{$school->id}",
            ] && $event->topics === [
                'overview',
                'learners',
                'learner-detail',
                'analytics',
                'reports',
                'instructional-insights',
                'assessment-reviews',
            ],
        );
    }

    public function test_rolled_back_progress_does_not_publish_a_signal(): void
    {
        Event::fake([StaffDataChanged::class]);
        $school = $this->school();
        $teacher = $this->teacher($school);
        $learner = $this->learner($school, $teacher);

        DB::beginTransaction();
        try {
            LearnerProgressState::query()->create([
                'learner_id' => $learner->id,
                'stage' => 'required_lessons',
                'current_required_lesson_order' => 2,
                'last_confirmed_at' => now(),
            ]);
        } finally {
            DB::rollBack();
        }

        Event::assertNotDispatched(StaffDataChanged::class);
    }

    public function test_diagnostic_skip_publishes_every_affected_staff_view(): void
    {
        $school = $this->school();
        $teacher = $this->teacher($school);
        $learner = $this->learner($school, $teacher);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::BASELINE_STAGE,
        ]);
        Event::fake([StaffDataChanged::class]);

        app(LearnerDiagnosticSkipService::class)->skip($learner);

        Event::assertDispatched(
            StaffDataChanged::class,
            fn (StaffDataChanged $event): bool => $event->topics === [
                'overview',
                'learners',
                'learner-detail',
                'analytics',
                'reports',
                'instructional-insights',
                'assessment-reviews',
            ],
        );
    }

    public function test_out_of_order_sixth_lesson_completion_publishes_final_ready_state(): void
    {
        $school = $this->school();
        $teacher = $this->teacher($school);
        $learner = $this->learner($school, $teacher);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => LearnerProgressState::REQUIRED_LESSONS_STAGE,
            'current_required_lesson_order' => 1,
            'diagnostic_completed_at' => now()->subDay(),
        ]);

        foreach ([1, 2, 3, 5, 6] as $order) {
            $this->lessonRun($learner, $order, LessonRun::STATUS_COMPLETED);
        }
        $sixthRun = $this->lessonRun($learner, 4, LessonRun::STATUS_ACTIVE);
        Event::fake([StaffDataChanged::class]);

        app(LearnerLessonCompletionService::class)->complete(
            $sixthRun,
            'reading.sentence_star',
        );

        $this->assertSame(
            LearnerProgressState::FINAL_ASSESSMENT_STAGE,
            $learner->progressState()->firstOrFail()->stage,
        );
        Event::assertDispatched(
            StaffDataChanged::class,
            fn (StaffDataChanged $event): bool => in_array(
                'learner-detail',
                $event->topics,
                true,
            ) && in_array('reports', $event->topics, true),
        );
    }

    public function test_teacher_creation_emits_one_school_scoped_directory_signal(): void
    {
        Event::fake([StaffDataChanged::class]);
        $school = $this->school();
        $administrator = StaffUser::query()->create([
            'username' => 'realtime-school-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $school->id,
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);

        $this->postJson("/api/staff/school-admin/{$administrator->id}/teachers", [
            'username' => 'realtime-teacher',
            'temporary_password' => 'temporary-pass',
            'grade_level' => 4,
            'section' => 'Maple',
        ])->assertCreated();

        Event::assertDispatchedTimes(StaffDataChanged::class, 1);
        Event::assertDispatched(
            StaffDataChanged::class,
            fn (StaffDataChanged $event): bool => $event->channelNames === [
                'staff.system',
                "schools.{$school->id}",
            ] && $event->topics === [
                'overview',
                'classes',
                'teachers',
                'operations',
            ],
        );
    }

    public function test_failed_teacher_creation_does_not_emit_a_signal(): void
    {
        Event::fake([StaffDataChanged::class]);
        $school = $this->school();
        $administrator = StaffUser::query()->create([
            'username' => 'invalid-realtime-school-admin',
            'password' => 'temporary-pass',
            'role' => 'school_admin',
            'school_id' => $school->id,
            'display_name' => 'School Administrator',
            'is_active' => true,
        ]);
        $this->authenticateStaff($administrator);

        $this->postJson("/api/staff/school-admin/{$administrator->id}/teachers", [
            'username' => 'invalid-realtime-teacher',
            'temporary_password' => 'short',
            'grade_level' => 9,
            'section' => '',
        ])->assertUnprocessable();

        Event::assertNotDispatched(StaffDataChanged::class);
    }

    private function school(): School
    {
        return School::query()->create([
            'name' => 'Realtime School',
            'normalized_name' => 'realtime school',
        ]);
    }

    private function teacher(School $school): StaffUser
    {
        return StaffUser::query()->create([
            'username' => 'domain-event-teacher',
            'password' => 'temporary-pass',
            'role' => 'teacher',
            'school_id' => $school->id,
            'grade_level' => 4,
            'section' => 'Maple',
            'display_name' => 'Teacher',
            'is_active' => true,
        ]);
    }

    private function learner(School $school, StaffUser $teacher): Learner
    {
        return Learner::query()->create([
            'learner_code' => 'RT001',
            'account_purpose' => Learner::PURPOSE_STANDARD,
            'password' => 'temporary-pass',
            'first_name' => 'Realtime',
            'middle_name' => 'Domain',
            'last_name' => 'Learner',
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'grade_level' => 4,
            'section' => 'Maple',
            'is_active' => true,
        ]);
    }

    private function lessonRun(
        Learner $learner,
        int $order,
        string $status,
    ): LessonRun {
        return LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => "required-lesson-{$order}",
            'content_version' => 'v1',
            'status' => $status,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
            'completed_at' => $status === LessonRun::STATUS_COMPLETED
                ? now()->subMinute()
                : null,
        ]);
    }
}
