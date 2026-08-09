<?php

namespace App\Services;

use RuntimeException;

final class PublishedTtsCatalogDefinitions
{
    /** @return array<string, array{text: string, reference: string, path: string}> */
    public function english(): array
    {
        $definitions = [];
        foreach ((array) config('speech.clara_lines') as $speechKey => $speech) {
            if (! is_array($speech)
                || ! isset($speech['text'], $speech['reference'], $speech['path'])
                || ! is_string($speech['text'])
                || ! is_string($speech['reference'])
                || ! is_string($speech['path'])) {
                throw new RuntimeException("Invalid fixed TTS definition: {$speechKey}");
            }

            $definitions[$speechKey] = $speech;
        }

        $ordinals = (array) config('speech.assessment_item_cues.ordinals');
        foreach ((array) config('speech.assessment_item_cues.tasks') as $task => $definition) {
            if (! is_array($definition)
                || ! isset($definition['text'], $definition['reference'], $definition['path'])
                || ! is_string($definition['text'])
                || ! is_string($definition['reference'])
                || ! is_string($definition['path'])) {
                throw new RuntimeException("Invalid assessment TTS definition: {$task}");
            }

            foreach ($ordinals as $position => $ordinal) {
                if (! is_string($ordinal)) {
                    throw new RuntimeException("Invalid assessment TTS ordinal: {$position}");
                }

                $definitions["assessment-{$task}-item-{$position}"] = [
                    'text' => sprintf($definition['text'], $ordinal),
                    'reference' => $definition['reference'],
                    'path' => "{$definition['path']}/assessment-{$task}-item-{$position}.wav",
                ];
            }
        }

        return $definitions;
    }
}
