<?php

namespace Tests\Unit;

use App\Services\OfflinePracticePackCatalog;
use RuntimeException;
use Tests\TestCase;

final class OfflinePracticePackCatalogTest extends TestCase
{
    public function test_catalog_rejects_unsafe_pack_ids(): void
    {
        $definition = $this->definition();
        $definition['packs'][0]['pack_id'] = '../escape';

        $this->expectException(RuntimeException::class);
        new OfflinePracticePackCatalog($definition);
    }

    public function test_catalog_rejects_unexpected_academic_or_internal_fields(): void
    {
        $definition = $this->definition();
        $definition['packs'][0]['assessment_run_id'] = 42;

        $this->expectException(RuntimeException::class);
        new OfflinePracticePackCatalog($definition);
    }

    public function test_catalog_rejects_duplicate_source_or_practice_ids(): void
    {
        $definition = $this->definition();
        $definition['packs'][0]['source']['items'][1]['practice_item_id'] =
            $definition['packs'][0]['source']['items'][0]['practice_item_id'];

        $this->expectException(RuntimeException::class);
        new OfflinePracticePackCatalog($definition);
    }

    public function test_catalog_rejects_a_source_kind_with_a_different_interaction_mode(): void
    {
        $definition = $this->definition();
        $definition['packs'][0]['source']['items'][0]['interaction_mode'] = 'word_read';

        $this->expectException(RuntimeException::class);
        new OfflinePracticePackCatalog($definition);
    }

    public function test_catalog_accepts_multiple_packs_in_each_approved_category(): void
    {
        $packs = (new OfflinePracticePackCatalog)->available();
        $counts = [];
        foreach ($packs as $pack) {
            $counts[$pack['category_key']] = ($counts[$pack['category_key']] ?? 0) + 1;
        }

        $this->assertSame([
            'letters' => 2,
            'words' => 3,
            'phrases' => 2,
            'sentences' => 2,
            'passages' => 3,
            'comprehension' => 2,
        ], $counts);
        $this->assertCount(count($packs), array_unique(array_column($packs, 'pack_id')));
    }

    public function test_catalog_rejects_an_unknown_category(): void
    {
        $definition = $this->definition();
        $definition['packs'][0]['category_key'] = 'assessment';

        $this->expectException(RuntimeException::class);
        new OfflinePracticePackCatalog($definition);
    }

    /** @return array<string, mixed> */
    private function definition(): array
    {
        return require base_path('../../content/offline-practice/v1/packs.php');
    }
}
