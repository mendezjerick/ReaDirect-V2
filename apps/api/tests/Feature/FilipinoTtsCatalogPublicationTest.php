<?php

namespace Tests\Feature;

use App\Models\TtsSpeechLine;
use App\Models\TtsVoiceVersion;
use App\Services\FilipinoTtsAudioReviewSource;
use App\Services\FilipinoTtsCatalogSource;
use App\Services\PublishedTtsCatalogDefinitions;
use Database\Seeders\FilipinoTtsSpeechCatalogSeeder;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class FilipinoTtsCatalogPublicationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('tts_catalog');
    }

    public function test_source_audit_reports_the_exact_current_review_blockers(): void
    {
        $source = app(FilipinoTtsCatalogSource::class);
        $audit = $source->audit();

        $this->assertTrue($audit['publication_ready']);
        $this->assertSame(300, $audit['total_lines']);
        $this->assertSame([
            'draft' => 0,
            'academic_review_required' => 0,
            'approved' => 300,
            'rejected' => 0,
        ], $audit['line_review_counts']);
        $this->assertSame([
            'introduce' => 'approved',
            'instruction' => 'approved',
            'question' => 'approved',
            'result' => 'approved',
        ], $audit['reference_review']);
        $this->assertSame(300, $audit['candidate_generation_lines']);
        $this->assertSame([], $audit['blockers']);
    }

    public function test_candidate_scope_can_include_draft_instruction_lines_without_academic_rows(): void
    {
        $definitions = app(FilipinoTtsCatalogSource::class)
            ->candidateDefinitions(['instruction'], true, true);

        $this->assertCount(212, $definitions);
        foreach ($definitions as $definition) {
            $this->assertSame('instruction', $definition['reference']);
            $this->assertNotSame('', $definition['text']);
        }
    }

    public function test_first_review_batch_matches_approved_source_and_audio(): void
    {
        $path = dirname(__DIR__, 4)
            .'/content/tts/v1/fil-PH/review-batches/batch-001.csv';
        $handle = fopen($path, 'rb');
        $this->assertIsResource($handle);

        try {
            $headers = fgetcsv($handle);
            $this->assertSame([
                'batch_id',
                'speech_key',
                'reference_role',
                'source_review_status',
                'audio_review_status',
                'english_text',
                'filipino_text',
                'staged_audio_path',
                'duration_seconds',
                'sha256',
                'review_notes',
            ], $headers);

            $sourceLines = app(FilipinoTtsCatalogSource::class)->lines();
            $speechKeys = [];
            while (($values = fgetcsv($handle)) !== false) {
                $row = array_combine($headers, $values);
                $this->assertIsArray($row);
                $speechKey = $row['speech_key'];
                $this->assertArrayHasKey($speechKey, $sourceLines);
                $sourceLine = $sourceLines[$speechKey];

                $this->assertSame('batch-001', $row['batch_id']);
                $this->assertSame('instruction', $row['reference_role']);
                $this->assertSame('approved', $row['source_review_status']);
                $this->assertSame('approved', $row['audio_review_status']);
                $this->assertSame($sourceLine['english_text'], $row['english_text']);
                $this->assertSame($sourceLine['filipino_text'], $row['filipino_text']);
                $this->assertSame(
                    'apps/api/storage/app/private/tts/staging/fil-PH-v1/sh-fil/'
                        .$sourceLine['audio_path'],
                    $row['staged_audio_path'],
                );
                $this->assertGreaterThan(0, (float) $row['duration_seconds']);
                $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $row['sha256']);
                $speechKeys[] = $speechKey;
            }
        } finally {
            fclose($handle);
        }

        $this->assertSame([
            'lesson-6-mission-1',
            'lesson-6-clue-who',
            'lesson-6-clue-what',
            'lesson-6-clue-where',
            'lesson-6-clue-when',
        ], $speechKeys);
    }

    public function test_review_batches_cover_all_approved_source_and_audio_lines(): void
    {
        $root = dirname(__DIR__, 4);
        $sourceLines = app(FilipinoTtsCatalogSource::class)->lines();
        $reviewed = [];

        foreach (['batch-001.csv', 'batch-002.csv'] as $filename) {
            $path = $root.'/content/tts/v1/fil-PH/review-batches/'.$filename;
            $handle = fopen($path, 'rb');
            $this->assertIsResource($handle);

            try {
                $headers = fgetcsv($handle);
                $this->assertIsArray($headers);
                while (($values = fgetcsv($handle)) !== false) {
                    $row = array_combine($headers, $values);
                    $this->assertIsArray($row);
                    $speechKey = $row['speech_key'];
                    $this->assertArrayHasKey($speechKey, $sourceLines);
                    $this->assertArrayNotHasKey($speechKey, $reviewed);
                    $sourceLine = $sourceLines[$speechKey];

                    $this->assertSame('approved', $row['source_review_status']);
                    $this->assertSame('approved', $row['audio_review_status']);
                    $this->assertSame($sourceLine['reference_role'], $row['reference_role']);
                    $this->assertSame($sourceLine['english_text'], $row['english_text']);
                    $this->assertSame($sourceLine['filipino_text'], $row['filipino_text']);
                    $this->assertSame(
                        'apps/api/storage/app/private/tts/staging/fil-PH-v1/sh-fil/'
                            .$sourceLine['audio_path'],
                        $row['staged_audio_path'],
                    );
                    $this->assertGreaterThan(0, (float) $row['duration_seconds']);
                    $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $row['sha256']);
                    $reviewed[$speechKey] = true;
                }
            } finally {
                fclose($handle);
            }
        }

        $this->assertSame(array_keys($sourceLines), array_keys($reviewed));
        $this->assertCount(300, $reviewed);
    }

    public function test_audio_review_audit_is_ready_for_all_300_lines(): void
    {
        $reviews = app(FilipinoTtsAudioReviewSource::class);

        $this->assertSame([
            'review_ready' => true,
            'total_lines' => 300,
            'review_counts' => [
                'pending' => 0,
                'approved' => 300,
                'rejected' => 0,
            ],
        ], $reviews->audit());
        $this->assertCount(300, $reviews->approvedRows());
    }

    public function test_all_approved_roles_cover_every_publication_definition(): void
    {
        $source = app(FilipinoTtsCatalogSource::class);
        $definitions = $source->candidateDefinitions(
            ['introduce', 'instruction', 'question', 'result'],
            false,
            false,
        );

        $this->assertCount(300, $definitions);
        $this->assertCount(300, $source->publicationDefinitions());
        $referenceCounts = array_count_values(array_column($definitions, 'reference'));
        ksort($referenceCounts);
        $this->assertSame([
            'instruction' => 212,
            'introduce' => 1,
            'question' => 36,
            'result' => 51,
        ], $referenceCounts);
    }

    public function test_approved_atomic_source_seeds_a_language_scoped_300_line_catalog(): void
    {
        [$linePath, $referencePath] = $this->approvedSourceFiles();

        try {
            $source = new FilipinoTtsCatalogSource(
                app(PublishedTtsCatalogDefinitions::class),
                $linePath,
                $referencePath,
            );
            $this->app->instance(FilipinoTtsCatalogSource::class, $source);
            $definitions = $source->publicationDefinitions();
            $audio = $this->validWav();
            foreach ($definitions as $definition) {
                Storage::disk('tts_catalog')->put(
                    "sh-fil/{$definition['path']}",
                    $audio,
                );
            }

            app(FilipinoTtsSpeechCatalogSeeder::class)->run();

            $voice = TtsVoiceVersion::query()
                ->where('stable_key', FilipinoTtsSpeechCatalogSeeder::VOICE_KEY)
                ->firstOrFail();
            $this->assertSame('fil-PH', $voice->language_code);
            $this->assertSame('sh-fil', $voice->reference_set);
            $this->assertSame(TtsVoiceVersion::STATUS_PUBLISHED, $voice->status);
            $this->assertSame(
                300,
                TtsSpeechLine::query()
                    ->where('tts_voice_version_id', $voice->id)
                    ->where('status', TtsSpeechLine::STATUS_PUBLISHED)
                    ->count(),
            );
            $this->assertSame(
                $definitions['lesson-intro']['text'],
                TtsSpeechLine::query()
                    ->where('tts_voice_version_id', $voice->id)
                    ->where('speech_key', 'lesson-intro')
                    ->value('text'),
            );
        } finally {
            @unlink($linePath);
            @unlink($referencePath);
        }
    }

    /** @return array{string, string} */
    private function approvedSourceFiles(): array
    {
        $root = dirname(__DIR__, 4);
        $lineSource = fopen(
            $root.'/content/tts/v1/fil-PH/published-lines.csv',
            'rb',
        );
        $this->assertIsResource($lineSource);
        $linePath = tempnam(sys_get_temp_dir(), 'fil-lines-');
        $this->assertIsString($linePath);
        $lineTarget = fopen($linePath, 'wb');
        $this->assertIsResource($lineTarget);
        $headers = fgetcsv($lineSource);
        $this->assertIsArray($headers);
        fputcsv($lineTarget, $headers);
        while (($values = fgetcsv($lineSource)) !== false) {
            $row = array_combine($headers, $values);
            $this->assertIsArray($row);
            $row['review_status'] = 'approved';
            fputcsv($lineTarget, array_values($row));
        }
        fclose($lineSource);
        fclose($lineTarget);

        $referencePath = tempnam(sys_get_temp_dir(), 'fil-references-');
        $this->assertIsString($referencePath);
        $referenceTarget = fopen($referencePath, 'wb');
        $this->assertIsResource($referenceTarget);
        fputcsv($referenceTarget, [
            'reference_role',
            'reference_path',
            'review_status',
            'review_notes',
        ]);
        foreach (['introduce', 'instruction', 'question', 'result'] as $role) {
            fputcsv($referenceTarget, [
                $role,
                'assets/audio/voice-references/sh-fil/general.wav',
                'approved',
                'Test-only approved fixture.',
            ]);
        }
        fclose($referenceTarget);

        return [$linePath, $referencePath];
    }

    private function validWav(): string
    {
        $sampleCount = 4800;
        $data = str_repeat(pack('v', 0), $sampleCount);
        $format = pack('vvVVvv', 1, 1, 48000, 96000, 2, 16);
        $riffSize = 4 + 8 + strlen($format) + 8 + strlen($data);

        return 'RIFF'.pack('V', $riffSize).'WAVE'
            .'fmt '.pack('V', strlen($format)).$format
            .'data'.pack('V', strlen($data)).$data;
    }
}
