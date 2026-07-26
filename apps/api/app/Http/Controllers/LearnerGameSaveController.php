<?php

namespace App\Http\Controllers;

use App\Models\GameSave;
use App\Services\LearnerGameSaveService;
use App\Services\LearnerSessionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LearnerGameSaveController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessions,
        private readonly LearnerGameSaveService $saves,
    ) {}

    public function show(Request $request, string $gameKey): JsonResponse
    {
        $session = $this->sessions->resolve($request);
        $save = $this->saves->load($session, $gameKey);

        return response()->json([
            'game_key' => $gameKey,
            'save' => $save === null ? null : $this->serialize($save),
        ]);
    }

    public function update(Request $request, string $gameKey): JsonResponse
    {
        $session = $this->sessions->resolve($request);
        $validated = $request->validate([
            'checkpoint_key' => ['required', 'string', 'max:80', 'regex:/\A[a-z0-9][a-z0-9-]*\z/'],
            'save_schema_version' => ['required', 'integer', 'min:1', 'max:65535'],
            'state' => ['required', 'array'],
            'expected_revision' => ['required', 'integer', 'min:0'],
        ]);
        $save = $this->saves->save(
            $session,
            $gameKey,
            $validated['checkpoint_key'],
            $validated['save_schema_version'],
            $validated['state'],
            $validated['expected_revision'],
        );

        return response()->json([
            'game_key' => $gameKey,
            'save' => $this->serialize($save),
        ]);
    }

    public function reset(Request $request, string $gameKey): JsonResponse
    {
        $session = $this->sessions->resolve($request);
        $validated = $request->validate([
            'expected_revision' => ['required', 'integer', 'min:0'],
        ]);
        $this->saves->reset(
            $session,
            $gameKey,
            $validated['expected_revision'],
        );

        return response()->json([
            'game_key' => $gameKey,
            'save' => null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(GameSave $save): array
    {
        return [
            'checkpoint_key' => $save->checkpoint_key,
            'save_schema_version' => $save->save_schema_version,
            'state' => $save->state,
            'revision' => $save->revision,
            'saved_at' => $save->saved_at->toIso8601String(),
        ];
    }
}
