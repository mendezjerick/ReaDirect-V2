<?php

namespace Tests\Unit;

use App\Services\RealtimeHealthService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class RealtimeHealthServiceTest extends TestCase
{
    public function test_reverb_health_uses_a_live_socket_check(): void
    {
        $errorCode = 0;
        $errorMessage = '';
        $server = stream_socket_server(
            'tcp://127.0.0.1:0',
            $errorCode,
            $errorMessage,
        );
        $this->assertIsResource($server);
        $address = stream_socket_get_name($server, false);
        $this->assertIsString($address);
        $port = (int) substr((string) strrchr($address, ':'), 1);

        config()->set('broadcasting.default', 'reverb');
        config()->set('broadcasting.connections.reverb.options.host', '127.0.0.1');
        config()->set('broadcasting.connections.reverb.options.port', $port);

        $health = app(RealtimeHealthService::class);
        $this->assertSame('online', $health->reverb()['status']);

        fclose($server);
        $this->assertSame('offline', $health->reverb()['status']);
    }

    public function test_queue_health_reports_depth_age_and_failures(): void
    {
        config()->set('reverb.monitoring.queue_warning_depth', 2);
        config()->set('reverb.monitoring.oldest_job_warning_seconds', 30);
        $health = app(RealtimeHealthService::class);

        $this->assertSame('online', $health->queue()['status']);

        DB::table('jobs')->insert([
            [
                'queue' => 'broadcasts',
                'payload' => '{}',
                'attempts' => 0,
                'reserved_at' => null,
                'available_at' => now()->timestamp,
                'created_at' => now()->subMinute()->timestamp,
            ],
            [
                'queue' => 'broadcasts',
                'payload' => '{}',
                'attempts' => 1,
                'reserved_at' => now()->timestamp,
                'available_at' => now()->timestamp,
                'created_at' => now()->timestamp,
            ],
        ]);
        DB::table('failed_jobs')->insert([
            'uuid' => '51a31246-1fc3-47f2-b8b1-5baa8c1385e7',
            'connection' => 'database',
            'queue' => 'broadcasts',
            'payload' => '{}',
            'exception' => 'Synthetic test failure',
            'failed_at' => now(),
        ]);

        $result = $health->queue();

        $this->assertSame('degraded', $result['status']);
        $this->assertStringContainsString('1 ready', $result['detail']);
        $this->assertStringContainsString('1 processing', $result['detail']);
        $this->assertStringContainsString('1 failed', $result['detail']);
        $this->assertStringContainsString('oldest pending', $result['detail']);
    }

    public function test_reverb_health_reports_when_broadcasting_is_disabled(): void
    {
        config()->set('broadcasting.default', 'log');

        $result = app(RealtimeHealthService::class)->reverb();

        $this->assertSame('not_configured', $result['status']);
    }
}
