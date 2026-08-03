<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonRun;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class LearnerLessonSixTest extends TestCase
{
    public function test_lesson_selects_one_item_from_each_5w_family(): void
    {
        [$token, $learner] = $this->learnerSession('A');

        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-6/start')
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-6')
            ->assertJsonPath('mission.title', 'Answer the questions')
            ->assertJsonPath('progress.total', 5)
            ->assertJsonPath(
                'support.speech_keys.0',
                'lesson-6-mission-1',
            )
            ->json();

        $snapshot = DB::table('lesson_runs')
            ->where('id', $state['run_id'])
            ->value('content_snapshot');
        $items = json_decode($snapshot, true, flags: JSON_THROW_ON_ERROR)[
            'mission-1'
        ];

        $this->assertSame(
            ['what', 'when', 'where', 'who', 'why'],
            collect($items)->pluck('question_type')->sort()->values()->all(),
        );
        $this->assertSame(
            5,
            DB::table('lesson_target_exposures')
                ->where('learner_id', $learner->id)
                ->where(
                    'scope_key',
                    'required.lesson-6.comprehension-targets',
                )
                ->count(),
        );
    }

    public function test_wrong_choices_escalate_support_without_revealing_early(): void
    {
        [$token] = $this->learnerSession('B');
        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-6/start')
            ->json();
        $correct = $this->correctChoice($state['item']['item_key']);
        $wrong = collect(['a', 'b', 'c', 'd'])
            ->reject(fn (string $choice): bool => $choice === $correct)
            ->values();

        $first = $this->choose($token, $state, $wrong[0])
            ->assertOk()
            ->assertJsonPath('response.wrong_choice_count', 1)
            ->assertJsonPath(
                'response.assistance_level',
                'targeted_clue',
            )
            ->assertJsonPath('teaching.show_evidence', false)
            ->assertJsonPath('teaching.show_correct_choice', false)
            ->json();

        $second = $this->choose($token, $first, $wrong[1])
            ->assertOk()
            ->assertJsonPath('response.wrong_choice_count', 2)
            ->assertJsonPath(
                'response.assistance_level',
                'guided_display',
            )
            ->assertJsonPath('teaching.show_evidence', true)
            ->assertJsonPath('teaching.show_correct_choice', false)
            ->json();

        $third = $this->choose($token, $second, $wrong[2])
            ->assertOk()
            ->assertJsonPath('response.wrong_choice_count', 3)
            ->assertJsonPath(
                'response.assistance_level',
                'demonstration',
            )
            ->assertJsonPath('teaching.show_evidence', true)
            ->assertJsonPath('item.correct_choice_key', $correct)
            ->json();

        $this->choose($token, $third, $wrong[0])->assertStatus(409);

        $resolved = $this->choose($token, $third, $correct)
            ->assertOk()
            ->assertJsonPath('response.outcome', 'DEMONSTRATED')
            ->assertJsonPath('teaching.can_advance', true)
            ->json();

        $this->withToken($token)
            ->post(
                "/api/learners/lessons/lesson-6/{$resolved['run_id']}/advance",
            )
            ->assertOk()
            ->assertJsonPath('progress.current', 2);
    }

    public function test_finishing_lesson_six_unlocks_final_assessment(): void
    {
        [$token, $learner] = $this->learnerSession('C');
        foreach (range(1, 5) as $order) {
            LessonRun::query()->create([
                'learner_id' => $learner->id,
                'lesson_key' => "required-lesson-{$order}",
                'content_version' => 'v1',
                'status' => LessonRun::STATUS_COMPLETED,
                'mission_key' => 'mission-1',
                'current_item_index' => 0,
                'content_snapshot' => [],
                'completed_at' => now()->subMinute(),
            ]);
        }
        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-6/start')
            ->json();

        for ($item = 0; $item < 5; $item++) {
            $correct = $this->correctChoice($state['item']['item_key']);
            $state = $this->choose($token, $state, $correct)
                ->assertOk()
                ->assertJsonPath('response.outcome', 'INDEPENDENT_CORRECT')
                ->json();
            $state = $this->withToken($token)
                ->post(
                    "/api/learners/lessons/lesson-6/{$state['run_id']}/advance",
                )
                ->assertOk()
                ->json();
        }

        $this->assertSame('completed', $state['status']);
        $this->assertSame(
            'Question Detective',
            $state['completion']['achievement_name'],
        );
        $this->assertCount(6, $state['completion']['lessons']);
        $this->assertSame(
            'final_assessment',
            $learner->progressState()->firstOrFail()->stage,
        );
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.question_detective',
        ]);
    }

    private function choose(
        string $token,
        array $state,
        string $choice,
    ) {
        return $this->withToken($token)->postJson(
            "/api/learners/lessons/lesson-6/{$state['run_id']}/submit",
            [
                'item_key' => $state['item']['item_key'],
                'choice' => $choice,
            ],
        );
    }

    private function correctChoice(string $contentId): string
    {
        $path = dirname(__DIR__, 4)
            .'/content/lessons/v1/lesson-6-comprehension.csv';
        $handle = fopen($path, 'rb');
        $header = fgetcsv($handle);

        while (($values = fgetcsv($handle)) !== false) {
            $row = array_combine($header, $values);
            if ($row['content_id'] === $contentId) {
                fclose($handle);

                return $row['correct_choice_key'];
            }
        }

        fclose($handle);
        $this->fail("No Lesson 6 item exists for {$contentId}.");
    }

    /** @return array{string, Learner} */
    private function learnerSession(string $suffix): array
    {
        $learner = Learner::query()->create([
            'learner_code' => "L6{$suffix}01",
            'password' => 'local-password',
            'first_name' => 'Mila',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 6,
        ]);
        $token = "lesson-six-token-{$suffix}";
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
