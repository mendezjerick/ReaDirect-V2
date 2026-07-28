<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerClaraListeningSession;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class LearnerClaraListeningTest extends TestCase
{
    public function test_letters_class_is_available_before_the_diagnostic_without_changing_progress(): void
    {
        [$learner, $token] = $this->learnerSession();

        $response = $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/start')
            ->assertOk()
            ->assertJsonPath('lesson_key', 'letters')
            ->assertJsonPath('chapter_key', 'letter-names-a-e')
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('scene.key', 'parade-opening')
            ->assertJsonPath('scene.kind', 'story')
            ->assertJsonPath('scene.title', 'The little letters blew away')
            ->assertJsonPath('scene.item_progress.current', 1);

        $this->assertNotNull($response->json('session_id'));
        $this->assertSame(
            'before_diagnostic',
            $learner->progressState()->firstOrFail()->stage,
        );
    }

    public function test_letters_class_tells_one_story_teaches_five_names_and_completes(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/start')
            ->assertOk();

        $this->advance($token, 'parade-opening', 'find-a')
            ->assertJsonPath('scene.choices.1', 'a');
        $this->advance($token, 'find-a', 'teach-a')
            ->assertJsonPath('scene.pronunciation', 'ay');
        $this->advance($token, 'teach-a', 'find-b');
        $this->advance($token, 'find-b', 'teach-b')
            ->assertJsonPath('scene.pronunciation', 'bee');
        $this->advance($token, 'teach-b', 'find-c');
        $this->advance($token, 'find-c', 'teach-c')
            ->assertJsonPath('scene.pronunciation', 'see');
        $this->advance($token, 'teach-c', 'find-d');
        $this->advance($token, 'find-d', 'teach-d')
            ->assertJsonPath('scene.pronunciation', 'dee');
        $this->advance($token, 'teach-d', 'find-e');
        $this->advance($token, 'find-e', 'teach-e')
            ->assertJsonPath('scene.pronunciation', 'ee');
        $this->advance($token, 'teach-e', 'parade-finale')
            ->assertJsonPath('status', 'letters-complete')
            ->assertJsonPath('scene.kind', 'completion');
    }

    public function test_stale_or_invalid_letters_transitions_are_rejected(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/start');

        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/advance', [
                'scene_key' => 'letters-b',
                'action' => 'continue',
            ])
            ->assertStatus(409);

        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/advance', [
                'scene_key' => 'parade-opening',
                'action' => 'tell_more',
            ])
            ->assertUnprocessable();
    }

    public function test_a_retired_drill_checkpoint_restarts_at_the_story_opening(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/start')
            ->assertOk();

        LearnerClaraListeningSession::query()
            ->where('lesson_key', 'letters')
            ->update([
                'scene_key' => 'letters-c',
                'status' => LearnerClaraListeningSession::STATUS_ACTIVE,
            ]);

        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/start')
            ->assertOk()
            ->assertJsonPath('scene.key', 'parade-opening')
            ->assertJsonPath('status', 'active');
    }

    public function test_a_completed_letters_class_can_restart(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/start');
        foreach ([
            ['parade-opening', 'find-a'],
            ['find-a', 'teach-a'],
            ['teach-a', 'find-b'],
            ['find-b', 'teach-b'],
            ['teach-b', 'find-c'],
            ['find-c', 'teach-c'],
            ['teach-c', 'find-d'],
            ['find-d', 'teach-d'],
            ['teach-d', 'find-e'],
            ['find-e', 'teach-e'],
            ['teach-e', 'parade-finale'],
        ] as [$scene, $nextScene]) {
            $this->advance($token, $scene, $nextScene);
        }

        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/restart')
            ->assertOk()
            ->assertJsonPath('scene.key', 'parade-opening')
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('visit_count', 2);
    }

    private function advance(
        string $token,
        string $scene,
        string $expectedScene,
    ): TestResponse {
        return $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/letters/advance', [
                'scene_key' => $scene,
                'action' => 'continue',
            ])
            ->assertOk()
            ->assertJsonPath('scene.key', $expectedScene);
    }

    /** @return array{Learner, string} */
    private function learnerSession(): array
    {
        $learner = Learner::query()->create([
            'learner_code' => 'LC001',
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'before_diagnostic',
        ]);
        $plainToken = 'learn-with-clara-test-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $plainToken),
            'session_type' => 'standard',
            'expires_at' => now()->addHour(),
        ]);

        return [$learner, $plainToken];
    }
}
