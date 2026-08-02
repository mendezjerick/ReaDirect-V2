<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\StaffUser;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\ActivitySpeechManifestService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class LearnerActivitySpeechReadinessTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('tts_catalog');
        Http::preventStrayRequests();
    }

    public function test_assessment_readiness_validates_published_speech_without_calling_vox(): void
    {
        $this->publishActivity('assessment-part-one');
        [, $token] = $this->learnerSession('before_diagnostic');

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-one')
            ->assertJsonPath('ready', true)
            ->assertJsonPath('published_ready', true)
            ->assertJsonPath('runtime_required', false)
            ->assertJsonPath('runtime_ready', true)
            ->assertJsonPath('runtime_profiles', [])
            ->assertJsonPath('profiles_ready', [])
            ->assertJsonPath('voice_version', 'clara-sh-v1');

        Http::assertNothingSent();
    }

    public function test_lesson_one_validates_catalog_then_warms_only_the_result_profile(): void
    {
        $this->publishActivity('lesson-1');
        [, $token] = $this->learnerSession('required_lessons', 1);
        Http::fake([
            '*/warmup' => Http::response([
                'ready' => true,
                'device' => 'cuda',
                'profiles_ready' => ['result'],
            ]),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-1')
            ->assertJsonPath('ready', true)
            ->assertJsonPath('published_ready', true)
            ->assertJsonPath('runtime_required', true)
            ->assertJsonPath('runtime_ready', true)
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('profiles_ready.0', 'result')
            ->assertJsonPath('device', 'cuda');

        Http::assertSentCount(1);
        Http::assertSent(fn ($request): bool => $request->url() === 'http://127.0.0.1:8002/warmup'
            && $request->hasHeader('Authorization', 'Bearer '.config('speech.tts_token'))
            && $request->data() === ['profiles' => ['result']]);
    }

    public function test_lesson_two_validates_catalog_then_warms_result_and_instruction_profiles(): void
    {
        $this->publishActivity('lesson-2');
        [, $token] = $this->learnerSession('required_lessons', 2);
        Http::fake([
            '*/warmup' => Http::response([
                'ready' => true,
                'device' => 'cuda',
                'profiles_ready' => ['result', 'instruction'],
            ]),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-2')
            ->assertJsonPath('ready', true)
            ->assertJsonPath('published_ready', true)
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('runtime_profiles.1', 'instruction')
            ->assertJsonPath('profiles_ready.0', 'result')
            ->assertJsonPath('profiles_ready.1', 'instruction');

        Http::assertSent(fn ($request): bool => $request->data() === [
            'profiles' => ['result', 'instruction'],
        ]);
    }

    public function test_lesson_three_validates_catalog_then_warms_only_result(): void
    {
        $this->publishActivity('lesson-3');
        [, $token] = $this->learnerSession('required_lessons', 3);
        Http::fake([
            '*/warmup' => Http::response([
                'ready' => true,
                'device' => 'cuda',
                'profiles_ready' => ['result'],
            ]),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-3')
            ->assertJsonPath('ready', true)
            ->assertJsonPath('published_ready', true)
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('profiles_ready.0', 'result');

        Http::assertSent(fn ($request): bool => $request->data() === [
            'profiles' => ['result'],
        ]);
    }

    public function test_lesson_four_validates_catalog_then_warms_only_result(): void
    {
        $this->publishActivity('lesson-4');
        [, $token] = $this->learnerSession('required_lessons', 4);
        Http::fake([
            '*/warmup' => Http::response([
                'ready' => true,
                'device' => 'cuda',
                'profiles_ready' => ['result'],
            ]),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertOk()
            ->assertJsonPath('activity', 'lesson-4')
            ->assertJsonPath('ready', true)
            ->assertJsonPath('published_ready', true)
            ->assertJsonPath('runtime_profiles.0', 'result')
            ->assertJsonPath('profiles_ready.0', 'result');

        Http::assertSent(fn ($request): bool => $request->data() === [
            'profiles' => ['result'],
        ]);
    }

    public function test_browser_payload_cannot_replace_the_server_resolved_activity(): void
    {
        $this->publishActivity('assessment-part-one');
        [, $token] = $this->learnerSession('before_diagnostic');

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness', [
                'activity' => 'lesson-1',
                'runtime_profiles' => ['result'],
                'published_groups' => ['lesson-1-fixed'],
            ])
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-one')
            ->assertJsonPath('runtime_required', false)
            ->assertJsonPath('runtime_profiles', []);

        Http::assertNothingSent();
    }

    public function test_missing_or_modified_published_audio_blocks_readiness_before_vox(): void
    {
        $lines = $this->publishActivity('lesson-1');
        [, $token] = $this->learnerSession('required_lessons', 1);
        $missing = $lines['lesson-1-mission-1'];
        $modified = $lines['lesson-1-mission-2'];
        Storage::disk('tts_catalog')->delete($missing->audio_storage_path);
        Storage::disk('tts_catalog')->put(
            $modified->audio_storage_path,
            'RIFF-modified-without-approval',
        );

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertServiceUnavailable()
            ->assertJsonPath('activity', 'lesson-1')
            ->assertJsonPath('ready', false)
            ->assertJsonPath('published_ready', false)
            ->assertJsonPath('runtime_ready', false)
            ->assertJsonFragment(['lesson-1-mission-1'])
            ->assertJsonFragment(['lesson-1-mission-2']);

        Http::assertNothingSent();
    }

    public function test_vox_failure_keeps_runtime_activity_unavailable(): void
    {
        $this->publishActivity('lesson-1');
        [, $token] = $this->learnerSession('required_lessons', 1);
        Http::fake([
            '*/warmup' => Http::response(['detail' => 'model unavailable'], 503),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertServiceUnavailable()
            ->assertJsonPath('activity', 'lesson-1')
            ->assertJsonPath('ready', false)
            ->assertJsonPath('published_ready', true)
            ->assertJsonPath('runtime_required', true)
            ->assertJsonPath('runtime_ready', false)
            ->assertJsonPath('profiles_ready', []);
    }

    public function test_portal_readiness_uses_the_active_portal_destination(): void
    {
        $this->publishActivity('assessment-part-two');
        [$learner, $token] = $this->learnerSession('required_lessons', 1, 'portal');
        $administrator = StaffUser::query()->create([
            'username' => 'readiness-admin',
            'password' => 'local-password',
            'role' => 'system_admin',
            'display_name' => 'Readiness Admin',
            'is_active' => true,
        ]);
        LearnerPortalRun::query()->create([
            'learner_id' => $learner->id,
            'launched_by_staff_user_id' => $administrator->id,
            'target_key' => 'assessment-task-3b',
            'status' => LearnerPortalRun::ACTIVE_STATUS,
            'started_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        $this->withToken($token)
            ->postJson('/api/learners/tts/activity-readiness')
            ->assertOk()
            ->assertJsonPath('activity', 'assessment-part-two')
            ->assertJsonPath('ready', true)
            ->assertJsonPath('runtime_required', false);

        Http::assertNothingSent();
    }

    /** @return array<string, TtsSpeechLine> */
    private function publishActivity(string $activity): array
    {
        $manifest = app(ActivitySpeechManifestService::class)->forActivity($activity);
        $voice = TtsVoiceVersion::query()->create([
            'stable_key' => 'clara-sh-v1',
            'engine' => 'VoxCPM2',
            'model_identifier' => 'openbmb/VoxCPM2',
            'reference_set' => 'sh',
            'conditioning_version' => 'mono-peak-minus-6db-v1',
            'synthesis_config' => ['cfg_value' => 2.0],
            'status' => TtsVoiceVersion::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
        $lines = [];

        foreach ($manifest['published_speech_keys'] as $speechKey) {
            $audio = "RIFF-approved-{$speechKey}";
            $path = "sh/readiness/{$speechKey}.wav";
            Storage::disk('tts_catalog')->put($path, $audio);
            $lines[$speechKey] = TtsSpeechLine::query()->create([
                'tts_voice_version_id' => $voice->id,
                'speech_key' => $speechKey,
                'text' => "Approved {$speechKey}",
                'reference_role' => 'instruction',
                'audio_storage_disk' => 'tts_catalog',
                'audio_storage_path' => $path,
                'audio_sha256' => hash('sha256', $audio),
                'duration_ms' => 1000,
                'status' => TtsSpeechLine::STATUS_PUBLISHED,
                'generated_at' => now(),
                'approved_at' => now(),
            ]);
        }

        return $lines;
    }

    /** @return array{Learner, string} */
    private function learnerSession(
        string $stage,
        ?int $lessonOrder = null,
        string $sessionType = 'standard',
    ): array {
        $learner = Learner::query()->create([
            'learner_code' => 'SR001',
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
        $token = "speech-readiness-{$sessionType}-token";
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
