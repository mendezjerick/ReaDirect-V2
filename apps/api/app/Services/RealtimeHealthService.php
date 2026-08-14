<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Throwable;

final class RealtimeHealthService
{
    /**
     * @return array{
     *     service: string,
     *     status: 'online'|'offline'|'not_configured',
     *     detail: string
     * }
     */
    public function reverb(): array
    {
        if (! config('pilot.realtime_available', true)) {
            return [
                'service' => 'Reverb',
                'status' => 'not_configured',
                'detail' => 'Realtime updates are disabled for the pilot deployment.',
            ];
        }

        if (config('broadcasting.default') !== 'reverb') {
            return [
                'service' => 'Reverb',
                'status' => 'not_configured',
                'detail' => 'Reverb is not the active broadcast connection.',
            ];
        }

        $host = config('broadcasting.connections.reverb.options.host');
        $port = (int) config('broadcasting.connections.reverb.options.port');

        if (! is_string($host) || $host === '' || $port < 1) {
            return [
                'service' => 'Reverb',
                'status' => 'not_configured',
                'detail' => 'The Reverb publisher endpoint is incomplete.',
            ];
        }

        $timeout = max(
            0.05,
            (float) config('reverb.monitoring.socket_connect_timeout_seconds', 0.25),
        );
        $socket = @stream_socket_client(
            "tcp://{$host}:{$port}",
            $errorCode,
            $errorMessage,
            $timeout,
            STREAM_CLIENT_CONNECT,
        );

        if (is_resource($socket)) {
            fclose($socket);

            return [
                'service' => 'Reverb',
                'status' => 'online',
                'detail' => "The private WebSocket server accepted a live connection on {$host}:{$port}.",
            ];
        }

        return [
            'service' => 'Reverb',
            'status' => 'offline',
            'detail' => "The private WebSocket server did not answer on {$host}:{$port}.",
        ];
    }

    /**
     * @return array{
     *     service: string,
     *     status: 'online'|'degraded'|'offline'|'not_configured',
     *     detail: string
     * }
     */
    public function queue(): array
    {
        if (! config('pilot.realtime_available', true)) {
            return [
                'service' => 'Queue',
                'status' => 'not_configured',
                'detail' => 'The realtime broadcast queue is not needed in pilot mode.',
            ];
        }

        if (! is_array(config('queue.connections.database'))) {
            return [
                'service' => 'Queue',
                'status' => 'not_configured',
                'detail' => 'The durable database queue is not configured.',
            ];
        }

        try {
            $jobs = DB::table('jobs')->where('queue', 'broadcasts');
            $total = (clone $jobs)->count();
            $reserved = (clone $jobs)->whereNotNull('reserved_at')->count();
            $delayed = (clone $jobs)
                ->whereNull('reserved_at')
                ->where('available_at', '>', now()->timestamp)
                ->count();
            $ready = max(0, $total - $reserved - $delayed);
            $oldestCreatedAt = (clone $jobs)->min('created_at');
            $oldestAge = is_numeric($oldestCreatedAt)
                ? max(0, now()->timestamp - (int) $oldestCreatedAt)
                : 0;
            $failed = DB::table('failed_jobs')
                ->where('queue', 'broadcasts')
                ->count();
        } catch (Throwable) {
            return [
                'service' => 'Queue',
                'status' => 'offline',
                'detail' => 'The broadcast queue tables could not be inspected.',
            ];
        }

        $warningDepth = max(
            1,
            (int) config('reverb.monitoring.queue_warning_depth', 25),
        );
        $warningAge = max(
            1,
            (int) config('reverb.monitoring.oldest_job_warning_seconds', 30),
        );
        $status = $failed > 0
            || $total >= $warningDepth
            || $oldestAge >= $warningAge
                ? 'degraded'
                : 'online';

        return [
            'service' => 'Queue',
            'status' => $status,
            'detail' => "Broadcast queue: {$ready} ready, {$reserved} processing, {$delayed} delayed, {$failed} failed; oldest pending {$oldestAge}s.",
        ];
    }
}
