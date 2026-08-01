<?php

namespace Tests\Feature;

use Illuminate\Console\Events\CommandStarting;
use Illuminate\Support\Facades\Event;
use LogicException;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Tests\TestCase;

final class FreshMigrationGuardTest extends TestCase
{
    public function test_destructive_database_rebuild_commands_are_blocked(): void
    {
        foreach (['migrate:fresh', 'migrate:refresh', 'db:wipe'] as $command) {
            try {
                Event::dispatch(new CommandStarting(
                    $command,
                    new ArrayInput([]),
                    new NullOutput(),
                ));
                $this->fail("{$command} must be blocked before it can run.");
            } catch (LogicException $exception) {
                $this->assertStringContainsString($command, $exception->getMessage());
            }
        }
    }
}
