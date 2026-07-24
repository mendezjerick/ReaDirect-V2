<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerLessonFourTest extends TestCase
{
    public function test_start_locks_five_unique_sentences_and_correct_speech_uses_mu(): void
    {
        [$token, $learner] = $this->learnerSession('A');
        $start = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-4/start')
            ->assertOk()
            ->assertJsonPath('lesson_key', 'required-lesson-4')
            ->assertJsonPath('mission.title', 'Read the sentence')
            ->assertJsonPath('progress.total', 5)
            ->assertJsonPath('item.presentation', 'display_sentence')
            ->assertJsonPath('support.speech.0.speech_key', 'lesson-4-mission-1')
            ->json();

        $this->assertSame(
            5,
            DB::table('lesson_target_exposures')
                ->where('learner_id', $learner->id)
                ->where('scope_key', 'required.lesson-4.sentence-targets')
                ->count(),
        );

        $expected = strtolower(rtrim($start['item']['display_text'], '.'));
        Http::fake([
            '*/mu/transcribe' => Http::response([
                'raw_transcript' => $expected,
                'basic_normalized_transcript' => $expected,
                'audio_quality' => ['usable' => true, 'warnings' => []],
                'noise_reduction' => ['requires_retry' => false],
            ]),
        ]);

        $this->withToken($token)
            ->post(
                "/api/learners/lessons/lesson-4/{$start['run_id']}/submit",
                [
                    'item_key' => $start['item']['item_key'],
                    'audio' => UploadedFile::fake()->create(
                        'sentence.webm',
                        12,
                        'audio/webm',
                    ),
                ],
            )
            ->assertOk()
            ->assertJsonPath('response.final_transcript', $expected)
            ->assertJsonPath('response.outcome', 'INDEPENDENT_CORRECT')
            ->assertJsonPath('teaching.can_advance', true)
            ->assertJsonPath(
                'support.speech.1.speech_key',
                'lesson-4-feedback-independent',
            );

        Http::assertSent(
            fn ($request): bool => str_ends_with($request->url(), '/mu/transcribe')
                && str_contains($request->body(), "\r\n\r\nphrase\r\n"),
        );
    }

    public function test_five_skips_complete_lesson_four_and_unlock_lesson_five(): void
    {
        [$token, $learner] = $this->learnerSession('B');
        $state = $this->withToken($token)
            ->post('/api/learners/lessons/lesson-4/start')
            ->json();

        for ($item = 1; $item <= 5; $item++) {
            $state = $this->withToken($token)->postJson(
                "/api/learners/lessons/lesson-4/{$state['run_id']}/skip",
                ['item_key' => $state['item']['item_key']],
            )->assertOk()->json();
        }

        $this->assertSame('completed', $state['status']);
        $this->assertSame('Lesson 4 complete.', $state['completion']['title']);
        $this->assertSame('reading.sentence_star', $state['completion']['achievement_key']);
        $this->assertSame('Sentence Star', $state['completion']['achievement_name']);
        $this->assertSame(
            5,
            $learner->progressState()->firstOrFail()->current_required_lesson_order,
        );
        $this->assertDatabaseHas('learner_achievements', [
            'learner_id' => $learner->id,
            'achievement_key' => 'reading.sentence_star',
        ]);
    }

    /** @return array{string, Learner} */
    private function learnerSession(string $suffix): array
    {
        $learner = Learner::query()->create([
            'learner_code' => "L4{$suffix}01",
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => 'required_lessons',
            'current_required_lesson_order' => 4,
        ]);
        $token = "lesson-four-token-{$suffix}";
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
