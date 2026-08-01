<?php

namespace Tests\Feature;

use App\Events\RealtimeTransportProbe;
use App\Models\School;
use App\Models\StaffUser;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class RealtimeTransportFoundationTest extends TestCase
{
    public function test_realtime_endpoints_require_an_active_staff_session(): void
    {
        $this->getJson('/api/staff/realtime/config')->assertUnauthorized();
        $this->postJson('/api/staff/realtime/probe', [
            'nonce' => (string) Str::uuid(),
        ])->assertUnauthorized();
        $this->postJson('/api/staff/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => 'private-staff.system',
        ])->assertUnauthorized();
    }

    public function test_staff_receives_scoped_transport_configuration(): void
    {
        $teacher = $this->staffUser('teacher', 'transport-teacher');
        $this->authenticateStaff($teacher);

        $this->getJson('/api/staff/realtime/config')
            ->assertOk()
            ->assertJson([
                'enabled' => true,
                'app_key' => 'readirect-local',
                'auth_endpoint' => '/api/staff/broadcasting/auth',
                'channel' => "staff.users.{$teacher->id}",
                'data_channels' => ["teachers.{$teacher->id}"],
            ]);
    }

    public function test_realtime_data_channels_follow_the_authenticated_staff_scope(): void
    {
        $school = School::query()->create([
            'name' => 'Realtime Scope School',
            'normalized_name' => 'realtime scope school',
        ]);

        $systemAdministrator = $this->staffUser('system_admin', 'scope-system');
        $this->authenticateStaff($systemAdministrator);
        $this->getJson('/api/staff/realtime/config')
            ->assertOk()
            ->assertExactJson([
                'enabled' => true,
                'app_key' => 'readirect-local',
                'auth_endpoint' => '/api/staff/broadcasting/auth',
                'channel' => "staff.users.{$systemAdministrator->id}",
                'data_channels' => ['staff.system'],
            ]);

        $schoolAdministrator = $this->staffUser(
            'school_admin',
            'scope-school',
            $school->id,
        );
        $this->authenticateStaff($schoolAdministrator);
        $this->getJson('/api/staff/realtime/config')
            ->assertOk()
            ->assertJsonPath('data_channels', ["schools.{$school->id}"]);

        $unassignedAdministrator = $this->staffUser(
            'school_admin',
            'scope-unassigned',
        );
        $this->authenticateStaff($unassignedAdministrator);
        $this->getJson('/api/staff/realtime/config')
            ->assertOk()
            ->assertJsonPath('data_channels', []);
    }

    public function test_reverb_accepts_only_the_expected_browser_hosts(): void
    {
        $this->assertSame(
            ['127.0.0.1', 'localhost', 'staging.readirect.org'],
            config('reverb.apps.apps.0.allowed_origins'),
        );
        $this->assertSame(250, config('reverb.apps.apps.0.max_connections'));
        $this->assertSame(4096, config('reverb.apps.apps.0.max_message_size'));
        $this->assertSame('none', config('reverb.apps.apps.0.accept_client_events_from'));
        $this->assertTrue(config('reverb.apps.apps.0.rate_limiting.enabled'));
        $this->assertTrue(config('reverb.apps.apps.0.rate_limiting.terminate_on_limit'));
    }

    public function test_staff_can_only_authorize_their_own_transport_channel(): void
    {
        $teacher = $this->staffUser('teacher', 'transport-teacher');
        $otherTeacher = $this->staffUser('teacher', 'other-teacher');
        $this->authenticateStaff($teacher);

        $this->postJson('/api/staff/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => "private-staff.users.{$teacher->id}",
        ])
            ->assertOk()
            ->assertJsonStructure(['auth']);

        $this->postJson('/api/staff/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => "private-staff.users.{$otherTeacher->id}",
        ])->assertForbidden();
    }

    public function test_role_and_school_channel_boundaries_are_enforced(): void
    {
        $north = School::query()->create([
            'name' => 'North School',
            'normalized_name' => 'north school',
        ]);
        $south = School::query()->create([
            'name' => 'South School',
            'normalized_name' => 'south school',
        ]);
        $administrator = $this->staffUser(
            'school_admin',
            'north-admin',
            $north->id,
        );
        $teacher = $this->staffUser('teacher', 'north-teacher', $north->id);
        $this->authenticateStaff($administrator);

        $this->authorizeChannel("private-schools.{$north->id}")->assertOk();
        $this->authorizeChannel("private-schools.{$south->id}")->assertForbidden();
        $this->authorizeChannel("private-teachers.{$teacher->id}")->assertOk();
        $this->authorizeChannel('private-staff.system')->assertForbidden();
    }

    public function test_probe_is_an_after_commit_database_broadcast_job(): void
    {
        Event::fake([RealtimeTransportProbe::class]);
        $teacher = $this->staffUser('teacher', 'transport-teacher');
        $this->authenticateStaff($teacher);
        $nonce = (string) Str::uuid();

        $this->postJson('/api/staff/realtime/probe', ['nonce' => $nonce])
            ->assertStatus(202)
            ->assertJson(['queued' => true]);

        Event::assertDispatched(
            RealtimeTransportProbe::class,
            function (RealtimeTransportProbe $event) use ($teacher, $nonce): bool {
                $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event);
                $this->assertSame('database', $event->connection);
                $this->assertSame('broadcasts', $event->broadcastQueue);
                $this->assertSame(1, $event->broadcastWith()['version']);
                $this->assertSame($nonce, $event->broadcastWith()['nonce']);
                $this->assertArrayHasKey('occurred_at', $event->broadcastWith());

                return $event->staffUserId === $teacher->id
                    && $event->nonce === $nonce
                    && $event->broadcastOn()->name === "private-staff.users.{$teacher->id}";
            },
        );
    }

    private function authorizeChannel(string $channelName): TestResponse
    {
        return $this->postJson('/api/staff/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => $channelName,
        ]);
    }

    private function staffUser(
        string $role,
        string $username,
        ?int $schoolId = null,
    ): StaffUser {
        return StaffUser::query()->create([
            'username' => $username,
            'password' => 'local-test-password',
            'role' => $role,
            'school_id' => $schoolId,
            'display_name' => str_replace('-', ' ', $username),
            'is_active' => true,
        ]);
    }
}
