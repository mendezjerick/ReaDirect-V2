<?php

namespace Tests\Feature;

use App\Models\Learner;
use App\Models\LearnerSession;
use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class LearnerOfflinePracticeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('tts_catalog');
    }

    public function test_authenticated_list_manifest_and_content_are_read_only_and_sanitized(): void
    {
        $token = $this->createLearnerSession();
        $before = $this->academicCounts();

        $list = $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs')
            ->assertOk()
            ->assertJsonPath('schemaVersion', 1);
        $this->assertCount(14, $list->json('packs'));
        $this->assertSame(2, collect($list->json('packs'))->where('categoryKey', 'letters')->count());

        $manifest = $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs/letters-foundations-v1/manifest')
            ->assertOk();
        $listEntry = collect($list->json('packs'))
            ->firstWhere('packId', 'letters-foundations-v1');
        $this->assertSame($listEntry['manifestSha256'], $manifest->json('manifestSha256'));
        $this->assertSame([], $manifest->json('assets'));
        $this->assertSame('letters-set-1', $manifest->json('moduleKey'));
        $this->assertSame('letters', $manifest->json('categoryKey'));
        $this->assertStringStartsWith('/api/', $manifest->json('content.relativeApiPath'));
        $this->assertStringNotContainsString('content/lessons', $manifest->getContent());

        $content = $this->withToken($token)
            ->get('/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.2/content')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/json');
        $decoded = json_decode($content->getContent(), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('letters-foundations-v1', $decoded['packId']);
        $this->assertCount(6, $decoded['modules'][0]['items']);
        $this->assertNoAcademicFields($decoded);

        $comprehension = $this->withToken($token)
            ->get('/api/learners/offline-practice/packs/comprehension-foundations-v1/versions/2026.08.2/content')
            ->assertOk();
        $comprehensionDecoded = json_decode($comprehension->getContent(), true, flags: JSON_THROW_ON_ERROR);
        $comprehensionItem = $comprehensionDecoded['modules'][0]['items'][0];
        $this->assertSame('comprehension_choice', $comprehensionItem['interactionMode']);
        $this->assertCount(4, $comprehensionItem['comprehension']['choices']);
        $this->assertNoAcademicFields($comprehensionDecoded);

        $after = $this->academicCounts();
        $this->assertSame($before, $after);
    }

    public function test_published_fixed_audio_is_optional_but_served_with_exact_hash_when_available(): void
    {
        $audio = 'RIFF'.pack('V', 0).'WAVE';
        $voice = TtsVoiceVersion::query()->create([
            'stable_key' => 'clara-sh-v1',
            'language_code' => 'en',
            'engine' => 'VoxCPM2',
            'model_identifier' => 'fixed-test',
            'reference_set' => 'sh',
            'conditioning_version' => 'test',
            'synthesis_config' => ['test' => true],
            'status' => TtsVoiceVersion::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
        $path = 'sh/lesson-2-mission-1.wav';
        Storage::disk('tts_catalog')->put($path, $audio);
        TtsSpeechLine::query()->create([
            'tts_voice_version_id' => $voice->id,
            'speech_key' => 'lesson-2-mission-1',
            'text' => 'Read the word you see. Say the whole word.',
            'reference_role' => 'instruction',
            'audio_storage_disk' => 'tts_catalog',
            'audio_storage_path' => $path,
            'audio_sha256' => hash('sha256', $audio),
            'duration_ms' => 1000,
            'status' => TtsSpeechLine::STATUS_PUBLISHED,
            'approved_at' => now(),
        ]);
        $token = $this->createLearnerSession();

        $manifest = $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs/words-foundations-v1/manifest')
            ->assertOk();
        $this->assertSame(['en'], $manifest->json('availableClaraLanguages'));
        $this->assertSame(
            'audio/wav',
            $manifest->json('assets.0.mimeType'),
        );

        $this->withToken($token)
            ->get('/api/learners/offline-practice/packs/words-foundations-v1/versions/2026.08.2/assets/clara-words-foundations-v1-en')
            ->assertOk()
            ->assertHeader('Content-Type', 'audio/wav')
            ->assertHeader('X-ReaDirect-Asset-Sha256', hash('sha256', $audio))
            ->assertContent($audio);
    }

    public function test_mime_spoofed_fixed_audio_is_omitted_from_the_pack(): void
    {
        $audio = 'not-a-wav';
        $voice = TtsVoiceVersion::query()->create([
            'stable_key' => 'clara-sh-v1',
            'language_code' => 'en',
            'engine' => 'VoxCPM2',
            'model_identifier' => 'fixed-test',
            'reference_set' => 'sh',
            'conditioning_version' => 'test',
            'synthesis_config' => ['test' => true],
            'status' => TtsVoiceVersion::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
        $path = 'sh/lesson-2-mission-1.wav';
        Storage::disk('tts_catalog')->put($path, $audio);
        TtsSpeechLine::query()->create([
            'tts_voice_version_id' => $voice->id,
            'speech_key' => 'lesson-2-mission-1',
            'text' => 'Read the word you see. Say the whole word.',
            'reference_role' => 'instruction',
            'audio_storage_disk' => 'tts_catalog',
            'audio_storage_path' => $path,
            'audio_sha256' => hash('sha256', $audio),
            'duration_ms' => 1000,
            'status' => TtsSpeechLine::STATUS_PUBLISHED,
            'approved_at' => now(),
        ]);

        $token = $this->createLearnerSession();
        $manifest = $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs/words-foundations-v1/manifest')
            ->assertOk();

        $this->assertSame([], $manifest->json('assets'));
        $this->assertSame([], $manifest->json('availableClaraLanguages'));
    }

    public function test_authentication_and_path_boundaries_are_enforced(): void
    {
        $this->getJson('/api/learners/offline-practice/packs')->assertUnauthorized();
        $this->withToken('invalid-learner-token')
            ->getJson('/api/learners/offline-practice/packs')
            ->assertUnauthorized();

        $token = $this->createLearnerSession();
        $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs/not-a-pack/manifest')
            ->assertNotFound();
        $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.3/content')
            ->assertNotFound();
        $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs/letters-foundations-v1/versions/2026.08.1/assets/../secret')
            ->assertNotFound();
    }

    public function test_content_hash_is_deterministic_and_unknown_assets_are_not_cross_packable(): void
    {
        $token = $this->createLearnerSession();
        $path = '/api/learners/offline-practice/packs/phrases-foundations-v1/versions/2026.08.2/content';
        $first = $this->withToken($token)->get($path)->assertOk();
        $second = $this->withToken($token)->get($path)->assertOk();
        $this->assertSame($first->getContent(), $second->getContent());

        $this->withToken($token)
            ->getJson('/api/learners/offline-practice/packs/words-foundations-v1/versions/2026.08.2/assets/clara-phrases-foundations-v1-en')
            ->assertNotFound();
    }

    /** @return array<string, int> */
    private function academicCounts(): array
    {
        return collect([
            'lesson_runs', 'lesson_responses', 'lesson_item_attempts',
            'lesson_target_exposures', 'assessment_runs', 'assessment_responses',
            'learner_progress_states', 'learner_achievements',
        ])->mapWithKeys(fn (string $table): array => [$table => DB::table($table)->count()])->all();
    }

    private function assertNoAcademicFields(mixed $value): void
    {
        $forbidden = [
            'score', 'mastery', 'progression', 'achievement', 'assessmentRun',
            'lessonRun', 'transcript', 'muResult', 'nuResult', 'pendingUpload',
            'internalPath', 'asrModel', 'diagnosisKey',
        ];
        if (is_array($value)) {
            foreach ($value as $key => $child) {
                $this->assertFalse(in_array((string) $key, $forbidden, true));
                $this->assertNoAcademicFields($child);
            }
        }
    }

    private function createLearnerSession(): string
    {
        $learner = Learner::query()->create([
            'learner_code' => 'OP001',
            'password' => 'local-password',
            'first_name' => 'Offline',
            'middle_name' => '',
            'last_name' => 'Reader',
            'is_active' => true,
        ]);
        $plainToken = 'offline-practice-test-token';
        LearnerSession::query()->create([
            'learner_id' => $learner->id,
            'token_hash' => hash('sha256', $plainToken),
            'session_type' => 'standard',
            'last_seen_at' => now(),
            'expires_at' => now()->addHour(),
        ]);

        return $plainToken;
    }
}
