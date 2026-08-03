<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonRun;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

final class LearnerLessonTwoFoundationTest extends TestCase
{
    public function test_start_locks_ten_unique_words_and_resumes_the_exact_run(): void
    {
        [$token, $learner] = $this->learnerSession('A');

        $response = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-2')
            ->assertJsonPath('content_version', 'v1')
            ->assertJsonPath('mission.key', 'mission-1')
            ->assertJsonPath('mission.number', 1)
            ->assertJsonPath('mission.total', 2)
            ->assertJsonPath('progress.current', 1)
            ->assertJsonPath('progress.total', 5)
            ->assertJsonPath('item.presentation', 'display_word')
            ->assertJsonPath('support.display_mode', 'instruction')
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-2-mission-1')
            ->assertJsonPath('support.after_speech', 'record');

        $run = LessonRun::query()->findOrFail($response->json('run_id'));
        $missionOne = collect($run->content_snapshot['mission-1']);
        $missionTwo = collect($run->content_snapshot['mission-2']);
        $targets = $missionOne->concat($missionTwo)->pluck('target_key');

        $this->assertCount(5, $missionOne);
        $this->assertCount(5, $missionTwo);
        $this->assertCount(10, $targets);
        $this->assertCount(10, $targets->unique());
        $this->assertTrue($missionOne->every(
            fn (array $row): bool => $row['eligible_mission_1'] === 'true',
        ));
        $this->assertTrue($missionTwo->every(
            fn (array $row): bool => $row['eligible_mission_2'] === 'true'
                && mb_strtolower($row['highlighted_word'])
                    === mb_strtolower($row['spoken_target']),
        ));
        $this->assertArrayNotHasKey('spoken_target', $response->json('item'));
        $this->assertDatabaseCount('lesson_runs', 1);
        $this->assertSame(
            10,
            DB::table('lesson_target_exposures')
                ->where('learner_id', $learner->id)
                ->where('scope_key', 'required.lesson-2.word-targets')
                ->where('cycle', 1)
                ->count(),
        );

        $resume = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->assertOk()
            ->assertJsonPath('run_id', $run->id)
            ->assertJsonPath('item.item_key', $response->json('item.item_key'));
        $this->withToken($token)
            ->get("/api/learners/lessons/lesson-2/{$run->id}")
            ->assertOk()
            ->assertJsonPath('item.item_key', $resume->json('item.item_key'));

        $this->assertSame(
            $run->content_snapshot,
            LessonRun::query()->findOrFail($run->id)->content_snapshot,
        );
        $this->assertDatabaseCount('lesson_runs', 1);
    }

    public function test_start_allows_lesson_two_regardless_of_the_legacy_cursor(): void
    {
        [$token] = $this->learnerSession('B', 1);

        $this->withToken($token)
            ->postJson('/api/learners/lessons/lesson-2/start')
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-2')
            ->assertJsonPath('status', LessonRun::STATUS_ACTIVE);

        $this->assertDatabaseCount('lesson_runs', 1);
    }

    public function test_lesson_two_runs_remain_owned_by_the_authenticated_learner(): void
    {
        [$firstToken] = $this->learnerSession('C');
        [$secondToken] = $this->learnerSession('D');
        $runId = $this->withToken($firstToken)
            ->post('/api/learners/lessons/lesson-2/start')
            ->json('run_id');

        $this->withToken($secondToken)
            ->get("/api/learners/lessons/lesson-2/{$runId}")
            ->assertNotFound();
    }

    public function test_a_new_selection_cycle_begins_when_fewer_than_ten_words_remain(): void
    {
        [$token, $learner] = $this->learnerSession('E');
        $now = now();
        $exposures = array_map(
            fn (string $targetKey): array => [
                'learner_id' => $learner->id,
                'scope_key' => 'required.lesson-2.word-targets',
                'content_version' => 'v1',
                'cycle' => 1,
                'target_key' => $targetKey,
                'encountered_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            array_slice($this->lessonTwoTargetKeys(), 0, 44),
        );
        DB::table('lesson_target_exposures')->insert($exposures);

        $runId = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-2/start')
            ->assertOk()
            ->json('run_id');
        $run = LessonRun::query()->findOrFail($runId);
        $targets = collect($run->content_snapshot)->flatten(1)->pluck('target_key');

        $this->assertCount(10, $targets);
        $this->assertCount(10, $targets->unique());
        $this->assertSame(
            10,
            DB::table('lesson_target_exposures')
                ->where('learner_id', $learner->id)
                ->where('scope_key', 'required.lesson-2.word-targets')
                ->where('cycle', 2)
                ->count(),
        );
    }

    /** @return list<string> */
    private function lessonTwoTargetKeys(): array
    {
        $path = base_path('../../content/lessons/v1/lesson-2-word-items.csv');
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException('Lesson 2 fixture content is unavailable.');
        }

        try {
            $headers = fgetcsv($stream);
            if (! is_array($headers)) {
                throw new RuntimeException('Lesson 2 fixture content has no header.');
            }

            $targets = [];
            while (($values = fgetcsv($stream)) !== false) {
                $row = array_combine($headers, $values);
                if ($row !== false && $row['status'] === 'active') {
                    $targets[] = $row['target_key'];
                }
            }

            return $targets;
        } finally {
            fclose($stream);
        }
    }

    /** @return array{string, Learner} */
    private function learnerSession(string $suffix, int $lessonOrder = 2): array
    {
        $learner = Learner::query()->create([
            'learner_code' => "L2{$suffix}01",
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => $lessonOrder,
        ]);
        $token = "lesson-two-token-{$suffix}";
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [$token, $learner];
    }
}
