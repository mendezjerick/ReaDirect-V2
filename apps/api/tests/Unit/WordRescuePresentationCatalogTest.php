<?php

namespace Tests\Unit;

use App\Services\WordRescuePresentationCatalog;
use RuntimeException;
use Tests\TestCase;

final class WordRescuePresentationCatalogTest extends TestCase
{
    private string $fixturePath;

    protected function setUp(): void
    {
        parent::setUp();
        $path = tempnam(sys_get_temp_dir(), 'word-rescue-presentations-');
        $this->assertNotFalse($path);
        $this->fixturePath = $path;
    }

    protected function tearDown(): void
    {
        if (isset($this->fixturePath) && is_file($this->fixturePath)) {
            unlink($this->fixturePath);
        }

        parent::tearDown();
    }

    public function test_catalog_covers_every_active_lesson_two_word_and_exposes_only_phase_1a_mechanics(): void
    {
        $catalog = new WordRescuePresentationCatalog;
        $rows = $catalog->all();
        $sourceIds = array_keys($this->activeSourceRows());
        $actualIds = array_column($rows, 'content_id');
        sort($sourceIds);
        sort($actualIds);

        $this->assertCount(49, $rows);
        $this->assertSame($sourceIds, $actualIds);
        $this->assertSame(['icon' => 13, 'image' => 27, 'none' => 9], $this->visualKindCounts($rows));

        foreach ($rows as $row) {
            $this->assertSame('2', $row['missing_letter_index']);
            $this->assertSame('true', $row['build_word_enabled']);
            $this->assertSame('true', $row['missing_word_enabled']);
            $this->assertSame('false', $row['word_picture_match_enabled']);
            $this->assertCount(2, [
                $row['missing_letter_distractor_1'],
                $row['missing_letter_distractor_2'],
            ]);
        }
    }

    public function test_catalog_returns_a_stable_record_by_content_id(): void
    {
        $row = (new WordRescuePresentationCatalog)->forContentId('lesson-v1-word-bag');

        $this->assertSame('image', $row['visual_kind']);
        $this->assertSame('word-bag', $row['visual_key']);
        $this->assertSame('true', $row['picture_find_enabled']);
    }

    public function test_build_word_metadata_preserves_duplicate_letter_multiplicity_for_dad(): void
    {
        $row = (new WordRescuePresentationCatalog)->forContentId('lesson-v1-word-dad');
        $targetLetters = str_split('dad');
        $shuffledLetters = [$targetLetters[2], $targetLetters[0], $targetLetters[1]];

        $targetCounts = array_count_values($targetLetters);
        $shuffledCounts = array_count_values($shuffledLetters);
        ksort($targetCounts);
        ksort($shuffledCounts);
        $this->assertSame(['a' => 1, 'd' => 2], $targetCounts);
        $this->assertSame($targetCounts, $shuffledCounts);
        $this->assertSame('true', $row['build_word_enabled']);
    }

    public function test_missing_word_metadata_matches_the_approved_sentence_occurrence_and_target(): void
    {
        $source = $this->activeSourceRows()['lesson-v1-word-bat'];
        $row = (new WordRescuePresentationCatalog)->forContentId('lesson-v1-word-bat');

        $this->assertSame('bat', $source['highlighted_word']);
        $this->assertSame('1', $source['highlight_occurrence']);
        $this->assertSame('1', $row['missing_word_occurrence']);
        $this->assertSame(1, preg_match_all('/(?<![a-z])bat(?![a-z])/i', $source['context_sentence']));
    }

    public function test_picture_find_requires_a_reviewed_image_or_icon_and_text_only_words_use_fallback(): void
    {
        $rows = (new WordRescuePresentationCatalog)->all();

        foreach ($rows as $row) {
            $hasVisual = in_array($row['visual_kind'], ['image', 'icon'], true);
            $this->assertSame($hasVisual ? 'true' : 'false', $row['picture_find_enabled']);
            $this->assertSame($hasVisual ? 'approved' : 'not-applicable', $row['visual_review_status']);
            $this->assertSame($hasVisual ? 'planned' : 'not-required', $row['visual_asset_status']);
            $this->assertSame('', $hasVisual ? '' : $row['visual_key']);
        }
    }

    public function test_catalog_rejects_a_missing_presentation_row(): void
    {
        $rows = $this->presentationRows();
        array_pop($rows);
        $this->writePresentationRows($rows);

        $this->expectException(RuntimeException::class);
        (new WordRescuePresentationCatalog($this->fixturePath))->validate();
    }

    public function test_catalog_rejects_duplicate_and_unknown_content_ids(): void
    {
        $rows = $this->presentationRows();
        $rows[] = $rows[0];
        $this->writePresentationRows($rows);

        $this->expectException(RuntimeException::class);
        (new WordRescuePresentationCatalog($this->fixturePath))->validate();
    }

    public function test_catalog_rejects_an_unknown_content_id(): void
    {
        $rows = $this->presentationRows();
        $rows[0]['content_id'] = 'lesson-v1-word-not-approved';
        $this->writePresentationRows($rows);

        $this->expectException(RuntimeException::class);
        (new WordRescuePresentationCatalog($this->fixturePath))->validate();
    }

    public function test_catalog_rejects_invalid_visual_mechanics_and_sentence_metadata(): void
    {
        $rows = $this->presentationRows();
        $rows[0]['picture_find_enabled'] = 'false';
        $rows[0]['missing_letter_distractor_1'] = 'a';
        $rows[0]['missing_word_occurrence'] = '2';
        $this->writePresentationRows($rows);

        $this->expectException(RuntimeException::class);
        (new WordRescuePresentationCatalog($this->fixturePath))->validate();
    }

    /** @param list<array<string, string>> $rows */
    private function visualKindCounts(array $rows): array
    {
        $counts = array_count_values(array_column($rows, 'visual_kind'));
        ksort($counts);

        return $counts;
    }

    /** @return array<string, array<string, string>> */
    private function activeSourceRows(): array
    {
        $path = base_path('../../content/lessons/v1/lesson-2-word-items.csv');
        $handle = fopen($path, 'rb');
        $this->assertIsResource($handle);
        $headers = fgetcsv($handle, 0, ',', '"', '');
        $rows = [];

        while (($values = fgetcsv($handle, 0, ',', '"', '')) !== false) {
            $row = array_combine($headers, $values);
            if ($row !== false && $row['status'] === 'active') {
                $rows[$row['content_id']] = $row;
            }
        }
        fclose($handle);

        return $rows;
    }

    /** @return list<array<string, string>> */
    private function presentationRows(): array
    {
        $path = base_path('../../content/lessons/v1/word-rescue-presentations.csv');
        $handle = fopen($path, 'rb');
        $this->assertIsResource($handle);
        $headers = fgetcsv($handle, 0, ',', '"', '');
        $rows = [];

        while (($values = fgetcsv($handle, 0, ',', '"', '')) !== false) {
            $row = array_combine($headers, $values);
            $this->assertIsArray($row);
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }

    /** @param list<array<string, string>> $rows */
    private function writePresentationRows(array $rows): void
    {
        $handle = fopen($this->fixturePath, 'wb');
        $this->assertIsResource($handle);
        $headers = array_keys($rows[0]);
        fputcsv($handle, $headers, ',', '"', '');
        foreach ($rows as $row) {
            fputcsv($handle, array_values($row), ',', '"', '');
        }
        fclose($handle);
    }
}
