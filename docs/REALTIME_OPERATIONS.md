# Realtime operations

ReaDirect uses Laravel Reverb only for authenticated staff refresh signals.
Learner traffic, ASR inference, TTS inference, recordings, and database access
do not travel over Reverb.

## Runtime path

1. A staff browser opens the same-origin `/app` WebSocket path.
2. Vite proxies `/app` to the private Reverb listener on port 8080.
3. Private-channel authorization passes through `/api/staff/broadcasting/auth`.
4. Laravel commits a mutation and places one `StaffDataChanged` event on the
   durable database `broadcasts` queue.
5. The broadcast worker publishes the event to the authorized system, school,
   or teacher channel.
6. The browser invalidates only the affected TanStack Query prefixes.

Events contain topic names, a UUID, a contract version, and a timestamp. They
do not contain learner records, credentials, transcripts, or recordings.

## Security and capacity

- Allowed browser hosts are exact entries in `REVERB_ALLOWED_ORIGINS`.
- Application data uses private channels with staff-session authorization.
- Client-originated application events are disabled.
- Client messages are limited to 4 KiB.
- A client exceeding 120 messages in 60 seconds is disconnected.
- The application accepts at most 250 subscribed WebSocket connections.

The 250-connection ceiling was verified locally with 255 simultaneous
subscribed clients: 250 connected and five received the Reverb connection-limit
error. This limit protects the current single-host deployment and is intended
for staff dashboards, not learner devices. Change it only after another load
test and a review of expected concurrent staff use.

Reverb scaling is intentionally disabled. A multi-host deployment requires a
shared pub/sub design and a new capacity review before enabling scaling.

## Monitoring and recovery

The existing System Administrator monitoring response performs a live TCP
check against Reverb and inspects the `broadcasts` queue for ready, processing,
delayed, old, and failed jobs. Queue health becomes degraded at 25 pending jobs,
when the oldest job reaches 30 seconds, or when any broadcast job has failed.

Useful commands from `apps/api`:

```powershell
php artisan queue:monitor database:broadcasts --max=25
php artisan queue:failed
```

Logs are written below `.runtime/logs`, including `reverb.error.log` and
`broadcast-queue.error.log`.

The launcher supervises Reverb and the broadcast worker. If either exits, the
launcher stops the managed stack instead of leaving staging in a partially
working state. On startup it removes failed jobs older than seven days. Failed
jobs are not retried automatically because an operator must first determine
whether replaying the underlying event is safe.

Tune the limits with the `REVERB_APP_*` and `REVERB_*_WARNING_*` variables shown
in `apps/api/.env.example`.
