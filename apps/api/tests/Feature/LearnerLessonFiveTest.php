<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerLessonFiveTest extends TestCase
{
    public function test_passage_submission_opens_review_before_lesson_completion(): void
    {
        [$token, $learner] = $this->learnerSession('A');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-5/start')
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-5')
            ->assertJsonPath('mission.title', 'Read the passage')
            ->assertJsonPath('progress.total', 1)
            ->assertJsonPath('item.presentation', 'display_passage')
            ->assertJsonPath('item.time_limit_seconds', 60)
            ->assertJsonCount(1, 'item.authored_pages')
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-5-mission-1')
            ->json();

        $this->assertSame(
            1,
            DB::table('lesson_target_exposures')
                ->where('learner_id', $learner->id)
                ->where('scope_key', 'required.lesson-5.passage-targets')
                ->count(),
        );

        preg_match_all(
            "/[a-z0-9']+/",
            strtolower($start['item']['display_text']),
            $matches,
        );
        $expected = implode(' ', $matches[0]);
        Http::fake([
            '*/mu/transcribe' => Http::response([
                'raw_transcript' => $expected,
                'basic_normalized_transcript' => $expected,
                'segments' => [['start' => 1, 'end' => 31]],
                'audio_quality' => [
                    'usable' => true,
                    'warnings' => [],
                    'duration_seconds' => 32,
                ],
                'noise_reduction' => ['requires_retry' => false],
            ]),
        ]);

        $submitted = $this->withToken($token)
            ->post(
                "/api/learners/lessons/lesson-5/{$start['run_id']}/submit",
                [
                    'item_key' => $start['item']['item_key'],
                    'audio' => UploadedFile::fake()->create(
                        'passage.webm',
                        120,
                        'audio/webm',
                    ),
                ],
            )
            ->assertOk()
            ->assertJsonPath('status', 'review')
            ->assertJsonPath('passage_review.review_available', true)
            ->assertJsonPath('passage_review.performance_band', 'excellent')
            ->assertJsonPath('passage_review.reading_accuracy_percent', 100)
            ->assertJsonPath('passage_review.words_per_minute', 100)
            ->assertJsonPath('passage_review.words.0.status', 'correct')
            ->assertJsonPath(
                'support.speech.0.speech_key',
                'lesson-5-performance-excellent',
            )
            ->assertJsonPath('support.requires_speech_completion', true)
            ->assertJsonPath('completion', null)
            ->json();

        Http::assertSent(
            fn ($request): bool => str_ends_with($request->url(), '/mu/transcribe')
                && str_contains($request->body(), "\r\n\r\npassage\r\n"),
        );

        $this->assertSame(
            5,
            $learner->progressState()->firstOrFail()->current_required_lesson_order,
        );
        $this->assertDatabaseMissing('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.passage_explorer',
        ]);
        $this->withToken($token)
            ->post(
                "/api/learners/lessons/lesson-5/{$start['run_id']}/submit",
                [
                    'item_key' => $start['item']['item_key'],
                    'audio' => UploadedFile::fake()->create(
                        'second-passage.webm',
                        120,
                        'audio/webm',
                    ),
                ],
            )
            ->assertStatus(409);

        $this->withToken($token)
            ->post(
                "/api/learners/lessons/lesson-5/{$submitted['run_id']}/continue-review",
            )
            ->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('completion.title', 'Lesson 5 complete.')
            ->assertJsonPath(
                'completion.achievement_key',
                'reading.passage_explorer',
            )
            ->assertJsonPath(
                'completion.achievement_name',
                'Passage Explorer',
            );

        $this->assertSame(
            6,
            $learner->progressState()->firstOrFail()->current_required_lesson_order,
        );
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.passage_explorer',
        ]);
    }

    public function test_skipped_passage_has_neutral_review_before_completion(): void
    {
        [$token] = $this->learnerSession('B');
        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-5/start')
            ->json();

        $this->withToken($token)
            ->postJson(
                "/api/learners/lessons/lesson-5/{$state['run_id']}/skip",
                ['item_key' => $state['item']['item_key']],
            )
            ->assertOk()
            ->assertJsonPath('status', 'review')
            ->assertJsonPath('passage_review.skipped', true)
            ->assertJsonPath('passage_review.performance_band', 'skipped')
            ->assertJsonPath('passage_review.review_available', false)
            ->assertJsonPath('passage_review.words_per_minute', null)
            ->assertJsonPath(
                'support.speech.0.speech_key',
                'lesson-5-performance-skipped',
            );
    }

    /** @return array{string, Learner} */
    private function learnerSession(string $suffix): array
    {
        $learner = Learner::query()->create([
            'learner_code' => "L5{$suffix}01",
            'password' => 'local-password',
            'first_name' => 'Mila',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 5,
        ]);
        $token = "lesson-five-token-{$suffix}";
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
