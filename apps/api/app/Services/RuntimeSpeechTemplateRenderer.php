<?php

namespace App\Services;

use App\Support\SpeechLanguage;
use LogicException;

final class RuntimeSpeechTemplateRenderer
{
    /** @param array<string, string> $values */
    public function render(string $language, string $templateKey, array $values = []): string
    {
        $language = SpeechLanguage::normalize($language);
        $templates = config("tts_runtime_templates.{$language}");
        $template = is_array($templates) ? ($templates[$templateKey] ?? null) : null;
        if (! is_string($template) || $template === '') {
            throw new LogicException(
                "Runtime speech template {$templateKey} is unavailable for {$language}.",
            );
        }

        preg_match_all('/\{([a-z_]+)\}/', $template, $matches);
        $required = array_values(array_unique($matches[1]));
        $provided = array_keys($values);
        sort($required);
        sort($provided);

        if ($required !== $provided) {
            throw new LogicException(
                "Runtime speech template {$templateKey} received invalid placeholders.",
            );
        }

        if (isset($values['unit'])) {
            $values['unit'] = $this->localizedUnit($language, $values['unit']);
        }

        $replacements = [];
        foreach ($values as $placeholder => $value) {
            $normalized = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
            if ($normalized === '') {
                throw new LogicException(
                    "Runtime speech placeholder {$placeholder} cannot be empty.",
                );
            }
            $replacements["{{$placeholder}}"] = $normalized;
        }

        return strtr($template, $replacements);
    }

    private function localizedUnit(string $language, string $unit): string
    {
        if (! in_array($unit, ['phrase', 'sentence'], true)) {
            throw new LogicException("Unsupported runtime speech unit: {$unit}.");
        }

        if ($language === SpeechLanguage::FILIPINO) {
            return $unit === 'phrase' ? 'parirala' : 'pangungusap';
        }

        return $unit;
    }
}
