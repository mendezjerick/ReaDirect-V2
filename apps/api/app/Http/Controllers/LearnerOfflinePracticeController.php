<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\OfflinePracticeNotFoundException;
use App\Services\OfflinePracticePackAssembler;
use App\Services\OfflinePracticePackCatalog;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class LearnerOfflinePracticeController
{
    public function __construct(
        private readonly OfflinePracticePackCatalog $catalog,
        private readonly OfflinePracticePackAssembler $assembler,
    ) {}

    public function index(): JsonResponse
    {
        $packs = [];
        foreach ($this->catalog->available() as $pack) {
            $packs[] = $this->assemble($pack)['listEntry'];
        }

        return response()->json([
            'schemaVersion' => 1,
            'packs' => $packs,
        ]);
    }

    public function manifest(string $packId): JsonResponse
    {
        try {
            return response()->json(
                $this->assemble($this->catalog->requirePack($packId))['manifest'],
            );
        } catch (OfflinePracticeNotFoundException) {
            abort(404, 'Offline practice pack not found.');
        }
    }

    public function content(string $packId, string $version): Response
    {
        try {
            $payload = $this->assemble($this->catalog->requirePack($packId, $version));
        } catch (OfflinePracticeNotFoundException) {
            abort(404, 'Offline practice content not found.');
        }

        return response($payload['contentBytes'], 200, [
            'Content-Type' => 'application/json',
            'Content-Length' => (string) strlen($payload['contentBytes']),
            'ETag' => '"'.$payload['content']['packId'].'-'.$payload['content']['version'].'-'.$this->sha256($payload['contentBytes']).'"',
        ]);
    }

    public function asset(string $packId, string $version, string $assetId): Response
    {
        try {
            $payload = $this->assemble($this->catalog->requirePack($packId, $version));
        } catch (OfflinePracticeNotFoundException) {
            abort(404, 'Offline practice asset not found.');
        }

        $bytes = $payload['assets'][$assetId] ?? null;
        if (! is_string($bytes)) {
            abort(404, 'Offline practice asset not found.');
        }
        $descriptor = collect($payload['manifest']['assets'])
            ->firstWhere('assetId', $assetId);
        if (! is_array($descriptor)) {
            abort(404, 'Offline practice asset not found.');
        }

        return response($bytes, 200, [
            'Content-Type' => $descriptor['mimeType'],
            'Content-Length' => (string) strlen($bytes),
            'ETag' => '"'.$descriptor['sha256'].'"',
            'X-ReaDirect-Asset-Sha256' => $descriptor['sha256'],
        ]);
    }

    /** @param array<string, mixed> $pack @return array<string, mixed> */
    private function assemble(array $pack): array
    {
        return $this->assembler->assemble($pack, [
            'manifestPath' => route('learner.offline-practice.manifest', [
                'packId' => $pack['pack_id'],
            ], false),
            'contentPath' => route('learner.offline-practice.content', [
                'packId' => $pack['pack_id'],
                'version' => $pack['version'],
            ], false),
            'assetPath' => fn (string $assetId): string => route(
                'learner.offline-practice.asset',
                [
                    'packId' => $pack['pack_id'],
                    'version' => $pack['version'],
                    'assetId' => $assetId,
                ],
                false,
            ),
        ]);
    }

    private function sha256(string $bytes): string
    {
        return hash('sha256', $bytes);
    }
}
