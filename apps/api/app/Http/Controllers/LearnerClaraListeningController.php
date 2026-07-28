<?php

namespace App\Http\Controllers;

use App\Models\LearnerClaraListeningSession;
use App\Services\LearnerSessionResolver;
use App\Services\LearnWithClaraLettersFlow;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class LearnerClaraListeningController extends Controller
{
    public function __construct(
        private readonly LearnerSessionResolver $sessions,
        private readonly LearnWithClaraLettersFlow $flow,
    ) {}

    public function start(Request $request): JsonResponse
    {
        $learnerSession = $this->sessions->resolve($request);
        $listeningSession = LearnerClaraListeningSession::query()->firstOrCreate(
            [
                'learner_id' => $learnerSession->learner_id,
                'lesson_key' => 'letters',
            ],
            [
                'chapter_key' => 'letter-names-a-e',
                'scene_key' => LearnWithClaraLettersFlow::START_SCENE,
                'heard_story_keys' => [],
                'status' => LearnerClaraListeningSession::STATUS_ACTIVE,
            ],
        );

        if (! $this->flow->hasScene($listeningSession->scene_key)) {
            $listeningSession->forceFill([
                'chapter_key' => 'letter-names-a-e',
                'scene_key' => LearnWithClaraLettersFlow::START_SCENE,
                'story_branch' => null,
                'status' => LearnerClaraListeningSession::STATUS_ACTIVE,
                'chapter_completed_at' => null,
            ])->save();
        }

        return response()->json($this->serialize($listeningSession));
    }

    public function advance(Request $request): JsonResponse
    {
        $learnerSession = $this->sessions->resolve($request);
        $validated = $request->validate([
            'scene_key' => ['required', 'string', 'max:80'],
            'action' => ['required', 'string', 'in:continue'],
        ]);

        try {
            $listeningSession = DB::transaction(function () use ($learnerSession, $validated): LearnerClaraListeningSession {
                $checkpoint = LearnerClaraListeningSession::query()
                    ->where('learner_id', $learnerSession->learner_id)
                    ->where('lesson_key', 'letters')
                    ->lockForUpdate()
                    ->firstOrFail();

                abort_unless(
                    hash_equals($checkpoint->scene_key, $validated['scene_key']),
                    409,
                    'That companion-class scene is no longer active.',
                );

                $nextScene = $this->flow->nextScene($checkpoint->scene_key);
                $completed = $nextScene === LearnWithClaraLettersFlow::COMPLETION_SCENE;
                $checkpoint->forceFill([
                    'scene_key' => $nextScene,
                    'status' => $completed
                        ? LearnerClaraListeningSession::STATUS_LETTERS_COMPLETE
                        : LearnerClaraListeningSession::STATUS_ACTIVE,
                    'chapter_completed_at' => $completed ? now() : $checkpoint->chapter_completed_at,
                ])->save();

                return $checkpoint->fresh();
            });
        } catch (DomainException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        return response()->json($this->serialize($listeningSession));
    }

    public function restart(Request $request): JsonResponse
    {
        $learnerSession = $this->sessions->resolve($request);
        $listeningSession = LearnerClaraListeningSession::query()
            ->where('learner_id', $learnerSession->learner_id)
            ->where('lesson_key', 'letters')
            ->firstOrFail();
        $listeningSession->forceFill([
            'chapter_key' => 'letter-names-a-e',
            'scene_key' => LearnWithClaraLettersFlow::START_SCENE,
            'story_branch' => null,
            'visit_count' => $listeningSession->visit_count + 1,
            'status' => LearnerClaraListeningSession::STATUS_ACTIVE,
            'chapter_completed_at' => null,
        ])->save();

        return response()->json($this->serialize($listeningSession->fresh()));
    }

    /** @return array<string, mixed> */
    private function serialize(LearnerClaraListeningSession $session): array
    {
        $scene = $this->flow->scene($session->scene_key);

        return [
            'session_id' => $session->id,
            'lesson_key' => $session->lesson_key,
            'chapter_key' => $session->chapter_key,
            'status' => $session->status,
            'visit_count' => $session->visit_count,
            'scene' => [
                'key' => $session->scene_key,
                ...$scene,
            ],
            'prefetch_speech_keys' => $this->flow->prefetchSpeechKeys($session->scene_key),
        ];
    }
}
