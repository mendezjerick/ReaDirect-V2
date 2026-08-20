<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonRun;
use App\Models\StaffUser;
use App\Services\ActivitySpeechManifestService;
use Illuminate\Support\Facades\Config;
use LogicException;
use Tests\TestCase;

final class LearnerActivitySpeechManifestTest extends TestCase
{
    public function test_before_diagnostic_resolves_a_published_only_part_one_manifest(): void
    {
        $token = $this->learnerSession('before_diagnostic');

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=assessment-part-one')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-one')
            ->assertJsonPath('published_groups.0', 'assessment-part-one-fixed')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonPath('requires_runtime', false)
            ->assertJsonCount(32, 'published_speech_keys');
    }

    public function test_lesson_one_resolves_only_its_declared_result_runtime_profile(): void
    {
        $token = $this->learnerSession('required_lessons', 1);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=lesson-1')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-1')
            ->assertJsonPath('published_groups.0', 'lesson-1-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(52, 'published_speech_keys');
    }

    public function test_lesson_two_resolves_published_words_and_both_runtime_profiles(): void
    {
        $token = $this->learnerSession('required_lessons', 2);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=lesson-2')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-2')
            ->assertJsonPath('published_groups.0', 'lesson-2-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('runtime_profiles.1', 'instruction')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(69, 'published_speech_keys');
    }

    public function test_lesson_three_resolves_published_phrases_and_only_result_runtime(): void
    {
        $token = $this->learnerSession('required_lessons', 3);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=lesson-3')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-3')
            ->assertJsonPath('published_groups.0', 'lesson-3-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(34, 'published_speech_keys');
    }

    public function test_lesson_four_resolves_published_sentences_and_only_result_runtime(): void
    {
        $token = $this->learnerSession('required_lessons', 4);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=lesson-4')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-4')
            ->assertJsonPath('published_groups.0', 'lesson-4-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(34, 'published_speech_keys');
    }

    public function test_lesson_five_is_fully_published_without_runtime_warmup(): void
    {
        $token = $this->learnerSession('required_lessons', 5);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=lesson-5')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-5')
            ->assertJsonPath('published_groups.0', 'lesson-5-fixed')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonPath('requires_runtime', false)
            ->assertJsonCount(9, 'published_speech_keys');
    }

    public function test_lesson_six_is_fully_published_without_runtime_warmup(): void
    {
        $token = $this->learnerSession('required_lessons', 6);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=lesson-6')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-6')
            ->assertJsonPath('published_groups.0', 'lesson-6-fixed')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonPath('requires_runtime', false)
            ->assertJsonCount(47, 'published_speech_keys');
    }

    public function test_learn_with_clara_letters_is_published_only(): void
    {
        $manifest = app(ActivitySpeechManifestService::class)
            ->forActivity('learn-with-clara-letters');

        $this->assertSame('learn-with-clara-letters', $manifest['activity']);
        $this->assertSame(
            ['learn-with-clara-letters-fixed'],
            $manifest['published_groups'],
        );
        $this->assertCount(12, $manifest['published_speech_keys']);
        $this->assertSame([], $manifest['runtime_profiles']);
        $this->assertFalse($manifest['requires_runtime']);
    }

    public function test_all_other_learn_with_clara_activities_are_published_only(): void
    {
        foreach ([
            'words' => 7,
            'phrases' => 5,
            'sentences' => 5,
            'comprehension' => 3,
        ] as $activity => $expectedLineCount) {
            $manifest = app(ActivitySpeechManifestService::class)
                ->forActivity("learn-with-clara-{$activity}");

            $this->assertSame(
                ["learn-with-clara-{$activity}-fixed"],
                $manifest['published_groups'],
            );
            $this->assertCount(
                $expectedLineCount,
                $manifest['published_speech_keys'],
            );
            $this->assertSame([], $manifest['runtime_profiles']);
            $this->assertFalse($manifest['requires_runtime']);
        }
    }

    public function test_diagnostic_part_two_is_explicitly_available_before_completion(): void
    {
        [$learner, $token] = $this->learnerSessionRecord('before_diagnostic');
        AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => 'diagnostic',
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_ACTIVE,
            'stage' => 'task-3a',
            'current_item_index' => 0,
            'content_snapshot' => [],
        ]);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=assessment-part-two')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-two')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonCount(14, 'published_speech_keys');
    }

    public function test_final_assessment_reuses_part_one_and_has_a_finale_part_two_manifest(): void
    {
        [$learner, $token] = $this->learnerSessionRecord('final_assessment');
        $this->completeAllLessons($learner);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=assessment-part-one')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-one')
            ->assertJsonCount(32, 'published_speech_keys');

        AssessmentRun::query()->create([
            'learner_id' => $learner->id,
            'assessment_type' => AssessmentRun::TYPE_FINAL,
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_ACTIVE,
            'stage' => 'task-3b',
            'current_item_index' => 0,
            'content_snapshot' => [],
        ]);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=assessment-final-part-two')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-final-part-two')
            ->assertJsonPath(
                'published_groups.0',
                'assessment-final-part-two-fixed',
            )
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonCount(14, 'published_speech_keys')
            ->assertJsonPath(
                'published_speech_keys.13',
                'assessment-final-complete',
            );
    }

    public function test_portal_session_uses_the_active_portal_target_instead_of_progress(): void
    {
        [$learner, $token] = $this->learnerSessionRecord('required_lessons', 1, 'portal');
        $administrator = StaffUser::query()->create([
            'username' => 'manifest-admin',
            'password' => 'local-password',
            'role' => 'system_admin',
            'display_name' => 'Manifest Admin',
            'is_active' => true,
        ]);
        LearnerPortalRun::query()->create([
            'learner_id' => $learner->id,
            'launched_by_staff_user_id' => $administrator->id,
            'target_key' => 'assessment-task-3a',
            'status' => LearnerPortalRun::ACTIVE_STATUS,
            'started_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=assessment-part-two')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-two')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonPath('requires_runtime', false)
            ->assertJsonCount(14, 'published_speech_keys');
    }

    public function test_lesson_request_is_rejected_before_the_diagnostic_gate(): void
    {
        $token = $this->learnerSession('before_diagnostic');

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=lesson-1')
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'The requested activity is not available for this learner.',
            );
    }

    public function test_diagnostic_request_is_rejected_after_the_diagnostic_gate(): void
    {
        $token = $this->learnerSession('required_lessons', 1);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=assessment-part-two')
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'The requested activity is not available for this learner.',
            );
    }

    public function test_final_request_is_rejected_until_all_six_lessons_are_complete(): void
    {
        $token = $this->learnerSession('required_lessons', 6);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest?activity=assessment-final-part-two')
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'The requested activity is not available for this learner.',
            );
    }

    public function test_activity_is_required(): void
    {
        $token = $this->learnerSession('before_diagnostic');

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('activity');
    }

    public function test_manifest_validation_rejects_unknown_published_groups(): void
    {
        Config::set('speech.activity_speech_manifests.lesson-1.published_groups', ['missing-group']);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('unknown published group missing-group');

        app(ActivitySpeechManifestService::class)->forActivity('lesson-1');
    }

    public function test_manifest_validation_rejects_unknown_speech_keys(): void
    {
        Config::set('speech.published_speech_groups.lesson-1-fixed', ['not-a-published-key']);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('unknown speech keys: not-a-published-key');

        app(ActivitySpeechManifestService::class)->forActivity('lesson-1');
    }

    public function test_manifest_validation_rejects_unknown_runtime_profiles(): void
    {
        Config::set('speech.activity_speech_manifests.lesson-1.runtime_profiles', ['narrator']);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('unknown runtime profiles: narrator');

        app(ActivitySpeechManifestService::class)->forActivity('lesson-1');
    }

    public function test_assessments_cannot_declare_runtime_profiles(): void
    {
        Config::set('speech.activity_speech_manifests.assessment-part-one.runtime_profiles', ['result']);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Assessment manifest assessment-part-one cannot declare runtime profiles.');

        app(ActivitySpeechManifestService::class)->forActivity('assessment-part-one');
    }

    private function learnerSession(
        string $stage,
        ?int $lessonOrder = null,
        string $sessionType = 'standard',
    ): string {
        [, $token] = $this->learnerSessionRecord($stage, $lessonOrder, $sessionType);

        return $token;
    }

    /** @return array{Learner, string} */
    private function learnerSessionRecord(
        string $stage,
        ?int $lessonOrder = null,
        string $sessionType = 'standard',
    ): array {
        $learner = Learner::query()->create([
            'learner_code' => 'SM001',
            'password' => 'local-password',
            'first_name' => 'Lena',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        LearnerProgressState::query()->create([
            'learner_id' => $learner->id,
            'stage' => $stage,
            'current_required_lesson_order' => $lessonOrder,
        ]);
        $token = "speech-manifest-{$sessionType}-token";
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $token),
            'session_type' => $sessionType,
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return [$learner, $token];
    }

    private function completeAllLessons(Learner $learner): void
    {
        foreach (range(1, 6) as $order) {
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
    }
}
