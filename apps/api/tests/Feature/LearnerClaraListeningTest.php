<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class LearnerClaraListeningTest extends TestCase
{
    public function test_it_is_available_before_the_diagnostic_and_does_not_change_progress(): void
    {
        [$learner, $token] = $this->learnerSession();

        $response = $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/lesson-1/start')
            ->assertOk()
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('scene.key', 'chapter-1-item-a')
            ->assertJsonPath('scene.display_text', 'A a')
            ->assertJsonPath('scene.item_progress.current', 1);

        $this->assertNotNull($response->json('session_id'));
        $this->assertSame(
            'before_diagnostic',
            $learner->progressState()->firstOrFail()->stage,
        );
    }

    public function test_it_persists_the_story_branch_and_completes_chapter_one(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/lesson-1/start')
            ->assertOk();

        $this->advance($token, 'chapter-1-item-a', 'continue', 'chapter-1-item-b');
        $this->advance($token, 'chapter-1-item-b', 'continue', 'chapter-1-story-opening');
        $this->advance($token, 'chapter-1-story-opening', 'tell_more', 'chapter-1-story-detail')
            ->assertJsonPath('story_branch', 'tell_more')
            ->assertJsonPath('heard_story_keys.0', 'clara-learning-to-write-her-name');
        $this->advance($token, 'chapter-1-story-detail', 'continue', 'chapter-1-story-close');
        $this->advance($token, 'chapter-1-story-close', 'continue', 'chapter-1-story-return');
        $this->advance($token, 'chapter-1-story-return', 'continue', 'chapter-1-item-c');
        $this->advance($token, 'chapter-1-item-c', 'continue', 'chapter-1-item-d');
        $this->advance($token, 'chapter-1-item-d', 'continue', 'chapter-1-item-e');
        $this->advance($token, 'chapter-1-item-e', 'continue', 'chapter-1-complete')
            ->assertJsonPath('status', 'chapter-1-complete');
    }

    public function test_keep_learning_skips_only_the_optional_story_detail(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)->postJson('/api/learners/learn-with-clara/lesson-1/start');
        $this->advance($token, 'chapter-1-item-a', 'continue', 'chapter-1-item-b');
        $this->advance($token, 'chapter-1-item-b', 'continue', 'chapter-1-story-opening');
        $this->advance($token, 'chapter-1-story-opening', 'keep_learning', 'chapter-1-story-return')
            ->assertJsonPath('story_branch', 'keep_learning');
        $this->advance($token, 'chapter-1-story-return', 'continue', 'chapter-1-item-c');
    }

    public function test_stale_or_invalid_transitions_are_rejected(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)->postJson('/api/learners/learn-with-clara/lesson-1/start');

        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/lesson-1/advance', [
                'scene_key' => 'chapter-1-item-b',
                'action' => 'continue',
            ])
            ->assertStatus(409);

        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/lesson-1/advance', [
                'scene_key' => 'chapter-1-item-a',
                'action' => 'tell_more',
            ])
            ->assertStatus(409);
    }

    public function test_a_completed_chapter_can_restart_without_forgetting_heard_stories(): void
    {
        [, $token] = $this->learnerSession();
        $this->withToken($token)->postJson('/api/learners/learn-with-clara/lesson-1/start');
        $this->advance($token, 'chapter-1-item-a', 'continue', 'chapter-1-item-b');
        $this->advance($token, 'chapter-1-item-b', 'continue', 'chapter-1-story-opening');
        $this->advance($token, 'chapter-1-story-opening', 'keep_learning', 'chapter-1-story-return');
        $this->advance($token, 'chapter-1-story-return', 'continue', 'chapter-1-item-c');
        $this->advance($token, 'chapter-1-item-c', 'continue', 'chapter-1-item-d');
        $this->advance($token, 'chapter-1-item-d', 'continue', 'chapter-1-item-e');
        $this->advance($token, 'chapter-1-item-e', 'continue', 'chapter-1-complete');

        $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/lesson-1/restart')
            ->assertOk()
            ->assertJsonPath('scene.key', 'chapter-1-item-a')
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('visit_count', 2)
            ->assertJsonPath('heard_story_keys.0', 'clara-learning-to-write-her-name');
    }

    private function advance(
        string $token,
        string $scene,
        string $action,
        string $expectedScene,
    ): TestResponse {
        return $this->withToken($token)
            ->postJson('/api/learners/learn-with-clara/lesson-1/advance', [
                'scene_key' => $scene,
                'action' => $action,
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
