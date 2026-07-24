<?php

namespace Tests\Feature;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
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
            ->getJson('/api/learners/tts/activity-manifest')
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
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-1')
            ->assertJsonPath('published_groups.0', 'lesson-1-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(51, 'published_speech_keys');
    }

    public function test_lesson_two_resolves_published_words_and_both_runtime_profiles(): void
    {
        $token = $this->learnerSession('required_lessons', 2);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-2')
            ->assertJsonPath('published_groups.0', 'lesson-2-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('runtime_profiles.1', 'instruction')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(19, 'published_speech_keys');
    }

    public function test_lesson_three_resolves_published_phrases_and_only_result_runtime(): void
    {
        $token = $this->learnerSession('required_lessons', 3);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-3')
            ->assertJsonPath('published_groups.0', 'lesson-3-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(33, 'published_speech_keys');
    }

    public function test_lesson_four_resolves_published_sentences_and_only_result_runtime(): void
    {
        $token = $this->learnerSession('required_lessons', 4);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-4')
            ->assertJsonPath('published_groups.0', 'lesson-4-fixed')
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('requires_runtime', true)
            ->assertJsonCount(33, 'published_speech_keys');
    }

    public function test_lesson_five_is_fully_published_without_runtime_warmup(): void
    {
        $token = $this->learnerSession('required_lessons', 5);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest')
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
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-6')
            ->assertJsonPath('published_groups.0', 'lesson-6-fixed')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonPath('requires_runtime', false)
            ->assertJsonCount(47, 'published_speech_keys');
    }

    public function test_learn_with_clara_lesson_one_is_published_only(): void
    {
        $manifest = app(ActivitySpeechManifestService::class)
            ->forActivity('learn-with-clara-lesson-1');

        $this->assertSame('learn-with-clara-lesson-1', $manifest['activity']);
        $this->assertSame(
            ['learn-with-clara-lesson-1-fixed'],
            $manifest['published_groups'],
        );
        $this->assertCount(13, $manifest['published_speech_keys']);
        $this->assertSame([], $manifest['runtime_profiles']);
        $this->assertFalse($manifest['requires_runtime']);
    }

    public function test_active_part_two_run_overrides_the_baseline_progress_stage(): void
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
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-two')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonCount(14, 'published_speech_keys');
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
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-two')
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonPath('requires_runtime', false)
            ->assertJsonCount(14, 'published_speech_keys');
    }

    public function test_unsupported_progress_does_not_silently_fall_back_to_another_manifest(): void
    {
        $token = $this->learnerSession('required_lessons', 7);

        $this->withToken($token)
            ->getJson('/api/learners/tts/activity-manifest')
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'No activity speech destination is available for learner stage required_lessons.',
            );
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
}
