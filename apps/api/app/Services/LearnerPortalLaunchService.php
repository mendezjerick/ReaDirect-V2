<?php

namespace App\Services;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerPortalRun;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class LearnerPortalLaunchService
{
    public const PART_ONE_ROUTE = '/learner/assessment/part-one';

    public const PART_TWO_ROUTE = '/learner/assessment/part-two';

    public const COMPLETION_ROUTE = '/learner/assessment/complete';

    public const LESSON_ONE_ROUTE = '/learner/lessons/1';

    public function __construct(
        private readonly AssessmentContentCatalog $contentCatalog,
        private readonly LessonContentCatalog $lessonContentCatalog,
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
            [
                'key' => 'assessment-story-selection',
                'label' => 'Choose a story',
                'description' => 'Open the persisted high branch before a story is confirmed.',
                'task' => 'Part 2',
            ],
            [
                'key' => 'assessment-task-3a',
                'label' => 'Passage reading',
                'description' => 'Open Task 3A with Lena at the Park confirmed.',
                'task' => 'Task 3A',
            ],
            [
                'key' => 'assessment-task-3b',
                'label' => 'Comprehension',
                'description' => 'Open the first linked 5W question after a persisted passage result.',
                'task' => 'Task 3B',
            ],
            [
                'key' => 'assessment-part-2-results',
                'label' => 'Part 2 Results',
                'description' => 'Open a committed reading-and-understanding result.',
                'task' => 'Result',
            ],
            [
                'key' => 'assessment-complete',
                'label' => 'Assessment Complete',
                'description' => 'Open the final Diagnostic completion celebration.',
                'task' => 'Completion',
            ],
            [
                'key' => 'lesson-1-mission-1',
                'label' => 'Lesson 1 · Letter pairs',
                'description' => 'Open Lesson 1 at its first uppercase and lowercase pair.',
                'task' => 'Lesson 1',
            ],
            [
                'key' => 'lesson-1-mission-2',
                'label' => 'Lesson 1 · First letters',
                'description' => 'Open the highlighted-first-letter mission with Mission 1 persisted.',
                'task' => 'Lesson 1',
            ],
            [
                'key' => 'lesson-1-mission-3',
                'label' => 'Lesson 1 · Missing letters',
                'description' => 'Open the missing-first-letter mission with earlier work persisted.',
                'task' => 'Lesson 1',
            ],
            [
                'key' => 'lesson-1-complete',
                'label' => 'Lesson 1 Complete',
                'description' => 'Open the Letter Leader completion presentation.',
                'task' => 'Completion',
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
            $isLessonTarget = str_starts_with($targetKey, 'lesson-1-');
            if ($isLessonTarget) {
                $run = $this->createLessonRun($learner, $targetKey);
                $this->seedLessonPrerequisites($run, $targetKey);
                $learner->progressState()->updateOrCreate([], [
                    'stage' => 'required_lessons',
                    'current_required_lesson_order' => $targetKey === 'lesson-1-complete' ? 2 : 1,
                    'diagnostic_completed_at' => now(),
                    'last_confirmed_at' => now(),
                ]);
            } else {
                $snapshot = $this->contentCatalog->assessmentSnapshot();
                $run = $this->createAssessmentRun($learner, $snapshot, $targetKey);
                $this->seedPrerequisites($run, $targetKey);
            }

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
                    ($isLessonTarget ? 'lesson_run_id' : 'assessment_run_id') => $run->id,
                ],
            ]);

            return [
                'learner' => $learner->fresh(),
                'token' => $plainToken,
                'target_key' => $targetKey,
                'route' => $this->routeFor($targetKey).($isLessonTarget ? '?run='.$run->id : ''),
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
                'assessment-story-selection' => 'story-selection',
                'assessment-task-3a' => 'task-3a',
                'assessment-task-3b' => 'task-3b',
                'assessment-part-2-results' => 'part-2-results',
                'assessment-complete' => 'assessment-complete',
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

        $highBranchTargets = [
            'assessment-task-2b',
            'assessment-part-1-results',
            'assessment-story-selection',
            'assessment-task-3a',
            'assessment-task-3b',
            'assessment-part-2-results',
            'assessment-complete',
        ];
        if (in_array($targetKey, $highBranchTargets, true)) {
            $attributes += [
                'part_one_branch' => 'high',
                'task_1a_score' => 7,
                'task_2a_score' => 10,
            ];
        }

        if (in_array($targetKey, array_slice($highBranchTargets, 1), true)) {
            $attributes += [
                'task_2b_score' => 8,
                'part_one_score' => 25,
                'part_one_level' => 'Light Refresher',
                'part_one_completed_at' => now(),
            ];
        }

        if (in_array($targetKey, ['assessment-task-3a', 'assessment-task-3b', 'assessment-part-2-results', 'assessment-complete'], true)) {
            $attributes += [
                'selected_story_key' => 'story:lena-at-park',
                'story_selected_at' => now(),
            ];
        }

        if (in_array($targetKey, ['assessment-task-3b', 'assessment-part-2-results', 'assessment-complete'], true)) {
            $attributes += [
                'passage_incorrect_words' => 10,
                'reading_accuracy_percent' => 80,
            ];
        }

        if (in_array($targetKey, ['assessment-part-2-results', 'assessment-complete'], true)) {
            $attributes += [
                'comprehension_score' => 4,
                'comprehension_percent' => 80,
                'final_reading_score' => 80,
                'final_reading_profile' => 'Transitioning Reader',
                'part_two_completed_at' => now(),
            ];
        }

        return AssessmentRun::query()->create($attributes);
    }

    private function seedPrerequisites(AssessmentRun $run, string $targetKey): void
    {
        if ($targetKey === 'assessment-task-2a') {
            $this->seedTaskResponses($run, 'task-1a', 6, $targetKey);
        }

        $highBranchTargets = [
            'assessment-task-2b',
            'assessment-part-1-results',
            'assessment-story-selection',
            'assessment-task-3a',
            'assessment-task-3b',
            'assessment-part-2-results',
            'assessment-complete',
        ];
        if (in_array($targetKey, $highBranchTargets, true)) {
            $this->seedTaskResponses($run, 'task-1a', 7, $targetKey);
        }

        if (in_array($targetKey, array_slice($highBranchTargets, 1), true)) {
            $this->seedTaskResponses($run, 'task-2b', 8, $targetKey);
        }

        if (in_array($targetKey, ['assessment-task-3b', 'assessment-part-2-results', 'assessment-complete'], true)) {
            $this->seedPassageResponse($run, $targetKey);
        }

        if (in_array($targetKey, ['assessment-part-2-results', 'assessment-complete'], true)) {
            $this->seedComprehensionResponses($run, $targetKey);
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

    private function seedPassageResponse(AssessmentRun $run, string $targetKey): void
    {
        $item = collect($run->content_snapshot['task-3a'])
            ->firstWhere('story_key', 'story:lena-at-park');
        AssessmentResponse::query()->create([
            'assessment_run_id' => $run->id,
            'task_key' => 'task-3a',
            'item_key' => $item['item_key'],
            'item_order' => 1,
            'response_type' => 'portal_prerequisite',
            'decision' => 'COMPLETED',
            'score' => 80,
            'evidence' => [
                'portal_prerequisite' => true,
                'portal_target_key' => $targetKey,
                'scoring' => ['incorrect_words' => 10, 'reading_accuracy_percent' => 80],
            ],
        ]);
    }

    private function seedComprehensionResponses(AssessmentRun $run, string $targetKey): void
    {
        $questions = collect($run->content_snapshot['task-3b'])
            ->where('story_key', 'story:lena-at-park')
            ->sortBy('story_question_order')
            ->values();
        foreach ($questions as $index => $item) {
            $correct = $index < 4;
            AssessmentResponse::query()->create([
                'assessment_run_id' => $run->id,
                'task_key' => 'task-3b',
                'item_key' => $item['item_key'],
                'item_order' => (int) $item['story_question_order'],
                'response_type' => 'portal_prerequisite',
                'selected_response' => $correct ? $item['correct_choice_key'] : 'd',
                'decision' => $correct ? 'CORRECT' : 'INCORRECT',
                'score' => $correct ? 1 : 0,
                'evidence' => [
                    'portal_prerequisite' => true,
                    'portal_target_key' => $targetKey,
                ],
            ]);
        }
    }

    private function createLessonRun(Learner $learner, string $targetKey): LessonRun
    {
        $mission = match ($targetKey) {
            'lesson-1-mission-1' => 'mission-1',
            'lesson-1-mission-2' => 'mission-2',
            'lesson-1-mission-3', 'lesson-1-complete' => 'mission-3',
        };

        return LessonRun::query()->create([
            'learner_id' => $learner->id,
            'lesson_key' => 'required-lesson-1',
            'content_version' => 'v1',
            'status' => $targetKey === 'lesson-1-complete' ? LessonRun::STATUS_COMPLETED : LessonRun::STATUS_ACTIVE,
            'mission_key' => $mission,
            'current_item_index' => 0,
            'content_snapshot' => $this->lessonContentCatalog->lessonOneSnapshot($learner->id),
            'completed_at' => $targetKey === 'lesson-1-complete' ? now() : null,
        ]);
    }

    private function seedLessonPrerequisites(LessonRun $run, string $targetKey): void
    {
        $missions = match ($targetKey) {
            'lesson-1-mission-1' => [],
            'lesson-1-mission-2' => ['mission-1'],
            'lesson-1-mission-3' => ['mission-1', 'mission-2'],
            'lesson-1-complete' => ['mission-1', 'mission-2', 'mission-3'],
        };

        foreach ($missions as $mission) {
            foreach ($run->content_snapshot[$mission] as $index => $item) {
                LessonResponse::query()->create([
                    'lesson_run_id' => $run->id,
                    'mission_key' => $mission,
                    'item_key' => $item['content_id'],
                    'item_order' => $index + 1,
                    'response_type' => 'portal_prerequisite',
                    'final_transcript' => $item['spoken_target'],
                    'decision' => 'CORRECT',
                    'evidence' => [
                        'portal_prerequisite' => true,
                        'portal_target_key' => $targetKey,
                    ],
                ]);
            }
        }

        if ($targetKey === 'lesson-1-complete') {
            LearnerAchievement::query()->firstOrCreate(
                ['learner_id' => $run->learner_id, 'achievement_key' => 'reading.letter_leader'],
                ['awarded_at' => now(), 'evidence' => ['portal_prerequisite' => true, 'lesson_run_id' => $run->id]],
            );
        }
    }

    private function routeFor(string $targetKey): string
    {
        if (str_starts_with($targetKey, 'lesson-1-')) {
            return self::LESSON_ONE_ROUTE;
        }
        if ($targetKey === 'assessment-complete') {
            return self::COMPLETION_ROUTE;
        }

        if (in_array($targetKey, [
            'assessment-story-selection',
            'assessment-task-3a',
            'assessment-task-3b',
            'assessment-part-2-results',
        ], true)) {
            return self::PART_TWO_ROUTE;
        }

        return self::PART_ONE_ROUTE;
    }
}
