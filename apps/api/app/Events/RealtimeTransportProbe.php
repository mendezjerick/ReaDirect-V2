<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class RealtimeTransportProbe implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public string $connection = 'database';

    public string $broadcastQueue = 'broadcasts';

    public int $tries = 3;

    public int $timeout = 15;

    public int $backoff = 2;

    public function __construct(
        public readonly int $staffUserId,
        public readonly string $nonce,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("staff.users.{$this->staffUserId}");
    }

    public function broadcastAs(): string
    {
        return 'realtime.transport.probe';
    }

    /** @return array{version: int, nonce: string, occurred_at: string} */
    public function broadcastWith(): array
    {
        return [
            'version' => 1,
            'nonce' => $this->nonce,
            'occurred_at' => now()->toIso8601String(),
        ];
    }
}
