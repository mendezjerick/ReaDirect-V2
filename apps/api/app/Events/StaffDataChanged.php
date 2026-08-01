<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

final class StaffDataChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;
    use SerializesModels;

    public string $connection = 'database';

    public string $broadcastQueue = 'broadcasts';

    public int $tries = 3;

    public int $timeout = 15;

    public int $backoff = 2;

    /**
     * @param  array<int, string>  $channelNames
     * @param  array<int, string>  $topics
     */
    public function __construct(
        public readonly array $channelNames,
        public readonly array $topics,
        public readonly string $eventId = '',
        public readonly string $occurredAt = '',
    ) {}

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        return array_map(
            static fn (string $channel): PrivateChannel => new PrivateChannel($channel),
            $this->channelNames,
        );
    }

    public function broadcastAs(): string
    {
        return 'staff.data.changed';
    }

    /** @return array{version: int, event_id: string, topics: array<int, string>, occurred_at: string} */
    public function broadcastWith(): array
    {
        return [
            'version' => 1,
            'event_id' => $this->eventId !== '' ? $this->eventId : (string) Str::uuid(),
            'topics' => $this->topics,
            'occurred_at' => $this->occurredAt !== '' ? $this->occurredAt : now()->toIso8601String(),
        ];
    }
}
