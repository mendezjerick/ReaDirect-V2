<?php

declare(strict_types=1);

namespace App\Services;

use JsonException;
use RuntimeException;

final class OfflinePracticePackAssembler
{
    public function __construct(
        private readonly OfflinePracticeSourceResolver $sources,
        private readonly OfflinePracticeAssetResolver $assets,
    ) {}

    /**
     * @param  array<string, mixed>  $pack
     * @param  array{manifestPath: string, contentPath: string, assetPath: callable}  $paths
     * @return array<string, mixed>
     *
     * @throws JsonException
     */
    public function assemble(array $pack, array $paths): array
    {
        $sourceItems = $this->sources->items($pack);
        $dialogues = [];
        $assetDescriptors = [];
        $assetBytes = [];
        $availableAudioLanguages = [];

        foreach ($pack['dialogues'] as $dialogue) {
            $assetId = 'clara-'.$pack['pack_id'].'-'.$dialogue['language'];
            $resolved = $dialogue['audio_optional']
                ? $this->assets->fixedClaraAudio(
                    $dialogue['language'],
                    $dialogue['speech_key'],
                    $dialogue['text'],
                )
                : null;
            $outputDialogue = [
                'dialogueKey' => $dialogue['dialogue_key'],
                'language' => $dialogue['language'],
                'text' => $dialogue['text'],
            ];
            if ($resolved !== null) {
                $outputDialogue['fixedSpeechKey'] = $dialogue['speech_key'];
                $outputDialogue['localAudioAssetId'] = $assetId;
                $assetBytes[$assetId] = $resolved['bytes'];
                $availableAudioLanguages[] = $dialogue['language'];
                $assetDescriptors[] = [
                    'assetId' => $assetId,
                    'kind' => 'clara_audio',
                    'language' => $dialogue['language'],
                    'mimeType' => $resolved['mimeType'],
                    'byteCount' => $resolved['byteCount'],
                    'sha256' => $resolved['sha256'],
                    'relativeApiPath' => ($paths['assetPath'])($assetId),
                ];
            }
            $dialogues[] = $outputDialogue;
        }

        $dialogueKeys = array_column($dialogues, 'dialogueKey');
        $availableAssetIds = array_column($assetDescriptors, 'assetId');
        $items = [];
        foreach ($sourceItems as $item) {
            $assembledItem = [
                'practiceItemId' => $item['practiceItemId'],
                'interactionMode' => $item['interactionMode'],
                'displayText' => $item['displayText'],
                'dialogueKeys' => $dialogueKeys,
                'assetIds' => $availableAssetIds,
            ];
            if (isset($item['comprehension'])) {
                $assembledItem['comprehension'] = $item['comprehension'];
            }
            $items[] = $assembledItem;
        }

        $content = [
            'schemaVersion' => 1,
            'packId' => $pack['pack_id'],
            'version' => $pack['version'],
            'dialogues' => $dialogues,
            'modules' => [[
                'moduleKey' => $pack['module_key'],
                'categoryKey' => $pack['category_key'],
                'title' => $pack['title'],
                'items' => $items,
            ]],
        ];
        $contentBytes = $this->encode($content);
        $this->enforceSize($contentBytes, 'max_content_bytes');

        $contentDescriptor = [
            'relativeApiPath' => $paths['contentPath'],
            'mimeType' => (string) config('offline_practice.allowed_content_mime'),
            'byteCount' => strlen($contentBytes),
            'sha256' => hash('sha256', $contentBytes),
        ];
        $totalBytes = strlen($contentBytes) + array_sum(array_map('strlen', $assetBytes));
        $this->enforceSize('', 'max_pack_bytes', $totalBytes);
        if (count($assetDescriptors) > (int) config('offline_practice.limits.max_asset_count')) {
            throw new RuntimeException('Offline practice asset limit exceeded.');
        }

        $manifest = [
            'schemaVersion' => 1,
            'packId' => $pack['pack_id'],
            'version' => $pack['version'],
            'moduleKey' => $pack['module_key'],
            'categoryKey' => $pack['category_key'],
            'title' => $pack['title'],
            'minimumAppVersion' => $pack['minimum_app_version'],
            'academicContentLanguage' => $pack['academic_content_language'],
            'supportedLanguages' => $pack['supported_languages'],
            'availableClaraLanguages' => array_values(array_unique($availableAudioLanguages)),
            'content' => $contentDescriptor,
            'assets' => $assetDescriptors,
            'totalBytes' => $totalBytes,
            'manifestSha256' => '',
            'createdAt' => $pack['created_at'],
            'updatedAt' => $pack['updated_at'],
        ];
        $manifest['manifestSha256'] = hash('sha256', $this->encode($manifest));
        $manifestBytes = $this->encode($manifest);
        $this->enforceSize($manifestBytes, 'max_manifest_bytes');

        return [
            'listEntry' => [
                'schemaVersion' => 1,
                'packId' => $pack['pack_id'],
                'version' => $pack['version'],
                'moduleKey' => $pack['module_key'],
                'categoryKey' => $pack['category_key'],
                'title' => $pack['title'],
                'supportedLanguages' => $pack['supported_languages'],
                'totalBytes' => $totalBytes,
                'manifestSha256' => $manifest['manifestSha256'],
                'updatedAt' => $pack['updated_at'],
                'status' => $pack['status'],
                'manifestPath' => $paths['manifestPath'],
            ],
            'manifest' => $manifest,
            'manifestBytes' => $manifestBytes,
            'content' => $content,
            'contentBytes' => $contentBytes,
            'assets' => $assetBytes,
        ];
    }

    private function encode(array $payload): string
    {
        return json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
        );
    }

    private function enforceSize(string $bytes, string $limitKey, ?int $knownSize = null): void
    {
        if (($knownSize ?? strlen($bytes)) > (int) config("offline_practice.limits.{$limitKey}")) {
            throw new RuntimeException("Offline practice {$limitKey} exceeded.");
        }
    }
}
