<?php

namespace App\Services;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerPortalRun;
use App\Models\LearnerSession;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class LearnerPortalLaunchService
{
    public const ROUTE = '/learner/assessment/part-one';

    public function __construct(
        private readonly AssessmentContentCatalog $contentCatalog,
        private readonly LearnerProgressResetService $resetService,
    ) {}

    /** @return list<array{key: string, label: string, description: string, task: string}> */
    public static function targets(): array
    {
        return [
            [
                'key' => 'assessment-orientation',
                'label' => 'Microphone check',
                'description' => 'Open Part 1 before the first scored item.',
                'task' => 'Setup',
            ],
            [
                'key' => 'assessment-task-1a',
                'label' => 'Letters',
                'description' => 'Start Task 1A at its first letter pair.',
                'task' => 'Task 1A',
            ],
            [
                'key' => 'assessment-task-2a',
                'label' => 'Rhyme Yes / No',
                'description' => 'Use the low branch and open its first rhyme pair.',
                'task' => 'Task 2A',
            ],
            [
                'key' => 'assessment-task-2b',
                'label' => 'Words',
                'description' => 'Use the high branch and open its first word.',
                'task' => 'Task 2B',
            ],
            [
                'key' => 'assessment-part-1-results',
                'label' => 'Part 1 Results',
                'description' => 'Open a persisted high-branch Part 1 result.',
                'task' => 'Result',
            ],
        ];
    }

    /**
     * @return array{
     *     learner: Learner,
     *     token: string,
     *     target_key: string,
     *     route: string,
     *     expires_at: string
     * }
     */
    public function launch(Learner $learner, StaffUser $actor, string $targetKey): array
    {
        return DB::transaction(function () use ($learner, $actor, $targetKey): array {
            $learner = $this->resetService->reset($learner, $actor);
            $snapshot = $this->contentCatalog->partOneSnapshot();
            $run = $this->createAssessmentRun($learner, $snapshot, $targetKey);
            $this->seedPrerequisites($run, $targetKey);

            $expiresAt = now()->addHour();
            LearnerPortalRun::query()->create([
                'learner_id' => $learner->id,
                'launched_by_staff_user_id' => $actor->id,
                'target_key' => $targetKey,
                'status' => LearnerPortalRun::ACTIVE_STATUS,
                'started_at' => now(),
                'expires_at' => $expiresAt,
            ]);

            $plainToken = Str::random(64);
            LearnerSession::query()->create([
                'learner_id' => $learner->id,
                'token_hash' => hash('sha256', $plainToken),
                'session_type' => 'portal',
                'last_seen_at' => now(),
                'expires_at' => $expiresAt,
            ]);

            StaffAuditLog::query()->create([
                'staff_user_id' => $actor->id,
                'action_key' => 'portal_system_learner.portal_launched',
                'description' => "Opened {$targetKey} for portal system Learner {$learner->learner_code}.",
                'metadata' => [
                    'learner_id' => $learner->id,
                    'learner_code' => $learner->learner_code,
                    'target_key' => $targetKey,
                    'assessment_run_id' => $run->id,
                ],
            ]);

            return [
                'learner' => $learner->fresh(),
                'token' => $plainToken,
                'target_key' => $targetKey,
                'route' => self::ROUTE,
                'expires_at' => $expiresAt->toIso8601String(),
            ];
        });
    }

    /** @param array<string, list<array<string, string>>> $snapshot */
    private function createAssessmentRun(Learner $learner, array $snapshot, string $targetKey): AssessmentRun
    {
        $attributes = [
            'learner_id' => $learner->id,
            'assessment_type' => 'diagnostic',
            'content_version' => 'v1',
            'status' => AssessmentRun::STATUS_ACTIVE,
            'stage' => match ($targetKey) {
                'assessment-orientation' => 'orientation',
                'assessment-task-1a' => 'task-1a',
                'assessment-task-2a' => 'task-2a',
                'assessment-task-2b' => 'task-2b',
                'assessment-part-1-results' => 'part-1-results',
            },
            'current_item_index' => 0,
            'content_snapshot' => $snapshot,
            'orientation_completed_at' => $targetKey === 'assessment-orientation' ? null : now(),
        ];

        if ($targetKey === 'assessment-task-2a') {
            $attributes += [
                'part_one_branch' => 'low',
                'task_1a_score' => 6,
            ];
        }

        if (in_array($targetKey, ['assessment-task-2b', 'assessment-part-1-results'], true)) {
            $attributes += [
                'part_one_branch' => 'high',
                'task_1a_score' => 7,
                'task_2a_score' => 10,
            ];
        }

        if ($targetKey === 'assessment-part-1-results') {
            $attributes += [
                'task_2b_score' => 8,
                'part_one_score' => 25,
                'part_one_level' => 'Light Refresher',
                'part_one_completed_at' => now(),
            ];
        }

        return AssessmentRun::query()->create($attributes);
    }

    private function seedPrerequisites(AssessmentRun $run, string $targetKey): void
    {
        if ($targetKey === 'assessment-task-2a') {
            $this->seedTaskResponses($run, 'task-1a', 6, $targetKey);
        }

        if (in_array($targetKey, ['assessment-task-2b', 'assessment-part-1-results'], true)) {
            $this->seedTaskResponses($run, 'task-1a', 7, $targetKey);
        }

        if ($targetKey === 'assessment-part-1-results') {
            $this->seedTaskResponses($run, 'task-2b', 8, $targetKey);
        }
    }

    private function seedTaskResponses(
        AssessmentRun $run,
        string $taskKey,
        int $correctCount,
        string $targetKey,
    ): void {
        foreach ($run->content_snapshot[$taskKey] as $index => $item) {
            $correct = $index < $correctCount;
            AssessmentResponse::query()->create([
                'assessment_run_id' => $run->id,
                'task_key' => $taskKey,
                'item_key' => $item['item_key'],
                'item_order' => (int) $item['sort_order'],
                'response_type' => 'portal_prerequisite',
                'scoring_transcript' => $correct ? $item['spoken_target'] : null,
                'decision' => $correct ? 'CORRECT' : 'INCORRECT',
                'score' => $correct ? 1 : 0,
                'evidence' => [
                    'portal_prerequisite' => true,
                    'portal_target_key' => $targetKey,
                ],
            ]);
        }
    }
}
