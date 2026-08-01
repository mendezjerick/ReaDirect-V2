<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\SystemSetting;
use App\Services\ActivitySpeechManifestService;
use App\Services\LessonOneSupportPresentation;
use App\Services\LessonTwoSupportPresentation;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class LearnerSpeechPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    public function test_published_only_mode_removes_runtime_profiles_and_support_calls(): void
    {
        SystemSetting::query()->create([
            'key' => 'learner.lightweight_mode',
            'value' => [
                'enabled' => true,
                'static_clara' => true,
                'published_speech_only' => true,
            ],
        ]);
        [$token, $learner] = $this->learnerSession();
        $lessonOneResponse = $this->response($learner, 'required-lesson-1', 'GIVING_CLUE', 1);
        $lessonTwoResponse = $this->response($learner, 'required-lesson-2', 'DEMONSTRATING', 2);

        $manifest = app(ActivitySpeechManifestService::class)->forActivity('lesson-1');
        $this->assertSame([], $manifest['runtime_profiles']);
        $this->assertFalse($manifest['requires_runtime']);

        $lessonOneSupport = app(LessonOneSupportPresentation::class)->forCurrentItem(
            $lessonOneResponse->run,
            $lessonOneResponse,
            ['content_id' => 'letter-a', 'spoken_target' => 'A'],
        );
        $this->assertSame([
            ['kind' => 'published', 'speech_key' => 'lesson-1-feedback-incorrect-first'],
            ['kind' => 'published', 'speech_key' => 'lesson-1-clue-mission-1'],
        ], $lessonOneSupport['speech']);

        $lessonTwoSupport = app(LessonTwoSupportPresentation::class)->forCurrentItem(
            $lessonTwoResponse->run,
            $lessonTwoResponse,
            ['content_id' => 'lesson-v1-word-bag', 'spoken_target' => 'bag'],
        );
        $this->assertSame([
            ['kind' => 'published', 'speech_key' => 'lesson-2-word-demo-bag'],
        ], $lessonTwoSupport['speech']);

        $this->withToken($token)
            ->post("/api/learners/tts/lesson-feedback/{$lessonOneResponse->id}")
            ->assertStatus(409);
        $this->withToken($token)
            ->post("/api/learners/tts/lesson-demonstration/{$lessonTwoResponse->id}")
            ->assertStatus(409);

        Http::assertNothingSent();
    }

    public function test_terminal_support_is_published_even_when_hybrid_speech_is_effective(): void
    {
        [, $learner] = $this->learnerSession();
        $response = $this->response(
            $learner,
            'required-lesson-1',
            'INDEPENDENT_FEEDBACK',
            1,
            'INDEPENDENT_CORRECT',
        );

        $support = app(LessonOneSupportPresentation::class)->forCurrentItem(
            $response->run,
            $response,
            ['content_id' => 'letter-a', 'spoken_target' => 'A'],
        );

        $this->assertSame([
            ['kind' => 'published', 'speech_key' => 'lesson-1-feedback-independent'],
        ], $support['speech']);
    }

    /** @return array{string, Learner} */
    private function learnerSession(): array
    {
        $learner = Learner::query()->create([
            'learner_code' => 'SP001',
            'password' => 'local-password',
            'first_name' => 'Speech',
            'middle_name' => '',
            'last_name' => 'Policy',
            'is_active' => true,
        ]);
        $token = 'learner-speech-policy-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [$token, $learner];
    }

    private function response(
        Learner $learner,
        string $lessonKey,
        string $teachingState,
        int $academicAttempts,
        ?string $outcome = null,
    ): LessonResponse {
        $run = LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => $lessonKey,
            'content_version' => 'v1',
            'status' => LessonRun::STATUS_ACTIVE,
            'mission_key' => 'mission-1',
            'current_item_index' => 0,
            'content_snapshot' => [],
        ]);

        return LessonResponse::query()->create([
            'lesson_run_id' => $run->id,
            'mission_key' => 'mission-1',
            'item_key' => 'lesson-item',
            'item_order' => 1,
            'response_type' => 'speech',
            'raw_transcript' => 'wrong',
            'final_transcript' => 'wrong',
            'decision' => 'NEEDS_SUPPORT',
            'teaching_state' => $teachingState,
            'outcome' => $outcome,
            'academic_attempt_count' => $academicAttempts,
        ])->load('run');
    }
}
