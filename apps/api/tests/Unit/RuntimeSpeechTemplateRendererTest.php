<?php

namespace Tests\Unit;

use App\Services\RuntimeSpeechTemplateRenderer;
use App\Support\SpeechLanguage;
use LogicException;
use Tests\TestCase;

final class RuntimeSpeechTemplateRendererTest extends TestCase
{
    public function test_runtime_configuration_matches_all_source_localization_rows(): void
    {
        $path = dirname(__DIR__, 4).'/content/tts/v1/fil-PH/runtime-templates.csv';
        $handle = fopen($path, 'rb');
        $this->assertIsResource($handle);
        $header = fgetcsv($handle);
        $this->assertIsArray($header);
        $rows = [];

        while (($values = fgetcsv($handle)) !== false) {
            $row = array_combine($header, $values);
            $this->assertIsArray($row);
            $rows[$row['template_key']] = $row;
        }
        fclose($handle);

        $this->assertCount(23, $rows);
        $this->assertSame(
            array_keys($rows),
            array_keys(config('tts_runtime_templates.en')),
        );
        $this->assertSame(
            array_keys($rows),
            array_keys(config('tts_runtime_templates.fil-PH')),
        );

        foreach ($rows as $key => $row) {
            $this->assertSame('approved', $row['review_status']);
            $this->assertStringStartsWith(
                'Approved by the product owner on 2026-08-08.',
                $row['review_notes'],
            );
            $this->assertSame(
                $row['english_template'],
                config('tts_runtime_templates.en')[$key] ?? null,
            );
            $this->assertSame(
                $row['filipino_template'],
                config('tts_runtime_templates.fil-PH')[$key] ?? null,
            );
        }
    }

    public function test_filipino_renderer_preserves_english_targets_and_localizes_units(): void
    {
        $renderer = app(RuntimeSpeechTemplateRenderer::class);

        $this->assertSame(
            'Narinig ko ang cap sa halip na cat.',
            $renderer->render(
                SpeechLanguage::FILIPINO,
                'alignment.replaced_word',
                ['actual' => 'cap', 'expected' => 'cat'],
            ),
        );
        $this->assertSame(
            'May ilang salitang naiiba. Basahin natin ang pangungusap nang paisa-isang salita.',
            $renderer->render(
                SpeechLanguage::FILIPINO,
                'alignment.default',
                ['unit' => 'sentence'],
            ),
        );
    }

    public function test_renderer_rejects_uncontrolled_placeholders_and_units(): void
    {
        $renderer = app(RuntimeSpeechTemplateRenderer::class);

        try {
            $renderer->render(
                SpeechLanguage::FILIPINO,
                'feedback.you_said_transcript',
                ['final' => 'cat', 'arbitrary' => 'text'],
            );
            $this->fail('An arbitrary placeholder was accepted.');
        } catch (LogicException $error) {
            $this->assertSame(
                'Runtime speech template feedback.you_said_transcript received invalid placeholders.',
                $error->getMessage(),
            );
        }

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Unsupported runtime speech unit: paragraph.');
        $renderer->render(
            SpeechLanguage::FILIPINO,
            'alignment.default',
            ['unit' => 'paragraph'],
        );
    }
}
