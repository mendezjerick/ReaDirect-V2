<?php

namespace App\Http\Controllers;

use App\Rules\GameUsername;
use App\Models\GameProfile;
use App\Services\LearnerGameProfileService;
use App\Services\LearnerSessionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LearnerGameProfileController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessions,
        private readonly LearnerGameProfileService $profiles,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $session = $this->sessions->resolve($request);
        $profile = $this->profiles->current($session);

        return response()->json([
            'profile' => $profile === null ? null : $this->serialize($profile),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $session = $this->sessions->resolve($request);
        $validated = $request->validate([
            'username' => ['required', 'string', new GameUsername()],
        ]);
        $result = $this->profiles->create($session, $validated['username']);

        return response()->json(
            ['profile' => $this->serialize($result['profile'])],
            $result['created'] ? 201 : 200,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(GameProfile $profile): array
    {
        return [
            'audience' => $profile->audience,
            'username' => $profile->username,
            'discriminator' => $profile->discriminator,
            'public_handle' => "{$profile->username}#{$profile->discriminator}",
            'is_active' => $profile->is_active,
        ];
    }
}
