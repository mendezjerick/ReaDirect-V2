<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LessonRun;
use App\Models\StaffUser;

final class SchoolAdminInstructionalInsightsService
{
    /** @var array<string, array{order: int, title: string, recommendation: string}> */
    private const TOPICS = [
        'letter-knowledge' => [
            'order' => 1,
            'title' => 'Letter names and sounds',
            'recommendation' => 'Teach letter names and sounds face-to-face',
        ],
        'rhyming' => [
            'order' => 2,
            'title' => 'Rhyming and sound patterns',
            'recommendation' => 'Teach rhyming and sound patterns face-to-face',
        ],
        'word-reading' => [
            'order' => 3,
            'title' => 'Word reading',
            'recommendation' => 'Teach word reading face-to-face',
        ],
        'phrase-reading' => [
            'order' => 4,
            'title' => 'Phrase reading',
            'recommendation' => 'Teach phrase reading face-to-face',
        ],
        'sentence-reading' => [
            'order' => 5,
            'title' => 'Sentence reading',
            'recommendation' => 'Teach sentence reading face-to-face',
        ],
        'passage-reading' => [
            'order' => 6,
            'title' => 'Passage reading',
            'recommendation' => 'Teach passage reading face-to-face',
        ],
        'comprehension' => [
            'order' => 7,
            'title' => 'Reading comprehension',
            'recommendation' => 'Teach reading comprehension face-to-face',
        ],
    ];

    /** @var array<string, array{title: string, topic: string}> */
    private const ASSESSMENT_TASKS = [
        'task-1a' => ['title' => 'Letter Pronunciation', 'topic' => 'letter-knowledge'],
        'task-2a' => ['title' => 'Rhyme Check', 'topic' => 'rhyming'],
        'task-2b' => ['title' => 'Word Pronunciation', 'topic' => 'word-reading'],
        'task-3a' => ['title' => 'Passage Reading', 'topic' => 'passage-reading'],
        'task-3b' => ['title' => 'Comprehension Check', 'topic' => 'comprehension'],
    ];

    /** @var array<string, array{order: int, title: string, topic: string}> */
    private const LESSONS = [
        'required-lesson-1' => ['order' => 1, 'title' => 'Letter names', 'topic' => 'letter-knowledge'],
        'required-lesson-2' => ['order' => 2, 'title' => 'Word reading', 'topic' => 'word-reading'],
        'required-lesson-3' => ['order' => 3, 'title' => 'Phrase reading', 'topic' => 'phrase-reading'],
        'required-lesson-4' => ['order' => 4, 'title' => 'Sentence reading', 'topic' => 'sentence-reading'],
        'required-lesson-5' => ['order' => 5, 'title' => 'Passage reading', 'topic' => 'passage-reading'],
        'required-lesson-6' => ['order' => 6, 'title' => 'Comprehension', 'topic' => 'comprehension'],
    ];

    /** @return array<string, mixed> */
    public function build(StaffUser $administrator): array
    {
        $administrator->loadMissing('school:id,name');
        $learners = Learner::query()
            ->with('teacher:id,display_name,username')
            ->where('school_id', $administrator->school_id)
            ->where('account_purpose', Learner::PURPOSE_STANDARD)
            ->where('is_active', true)
            ->orderBy('id')
            ->get();
        $learnerIds = $learners->pluck('id');

        $topicRows = [];
        foreach (self::TOPICS as $key => $definition) {
            $topicRows[$key] = [
                ...$definition,
                'key' => $key,
                'assessment_skips' => 0,
                'lesson_skips' => 0,
                'review_recommended_items' => 0,
                'learner_ids' => [],
                'evidence_keys' => [],
                'class_keys' => [],
            ];
        }

        $assessmentRows = [];
        foreach (self::ASSESSMENT_TASKS as $key => $definition) {
            $assessmentRows[$key] = [
                'task_key' => $key,
                'title' => $definition['title'],
                'topic_key' => $definition['topic'],
                'diagnostic_skips' => 0,
                'final_skips' => 0,
                'affected_learner_ids' => [],
            ];
        }

        $lessonRows = [];
        foreach (self::LESSONS as $key => $definition) {
            $lessonRows[$key] = [
                'lesson_key' => $key,
                'order' => $definition['order'],
                'title' => $definition['title'],
                'topic_key' => $definition['topic'],
                'skipped_items' => 0,
                'review_recommended_items' => 0,
                'affected_learner_ids' => [],
            ];
        }

        $classRows = [];
        $classKeyByLearner = [];
        foreach ($learners as $learner) {
            $classKey = $this->classKey($learner);
            $classKeyByLearner[$learner->id] = $classKey;

            if (! isset($classRows[$classKey])) {
                $classRows[$classKey] = [
                    'key' => $classKey,
                    'teacher' => $learner->teacher ? [
                        'id' => $learner->teacher->id,
                        'name' => $learner->teacher->display_name,
                        'username' => $learner->teacher->username,
                    ] : null,
                    'grade_level' => $learner->grade_level,
                    'section' => $learner->section,
                    'cohort_size' => 0,
                    'assessment_skips' => 0,
                    'lesson_skips' => 0,
                    'review_recommended_items' => 0,
                    'affected_learner_ids' => [],
                    'evidence_keys' => [],
                ];
            }

            $classRows[$classKey]['cohort_size']++;
        }

        $assessmentRuns = $learnerIds->isEmpty()
            ? collect()
            : AssessmentRun::query()
                ->with('responses')
                ->whereIn('learner_id', $learnerIds)
                ->latest('id')
                ->get()
                ->unique(
                    fn (AssessmentRun $run): string => "{$run->learner_id}:{$run->assessment_type}",
                )
                ->values();
        $wholeDiagnosticSkips = $assessmentRuns
            ->where('assessment_type', AssessmentRun::TYPE_DIAGNOSTIC)
            ->where(
                'completion_mode',
                AssessmentRun::COMPLETION_MODE_SKIPPED,
            )
            ->count();

        foreach ($assessmentRuns as $run) {
            foreach ($run->responses as $response) {
                if (! $this->isSkipped($response->response_type, $response->decision)) {
                    continue;
                }

                $task = self::ASSESSMENT_TASKS[$response->task_key] ?? null;
                if ($task === null) {
                    continue;
                }

                $assessmentType = $run->assessment_type === AssessmentRun::TYPE_FINAL
                    ? 'final_skips'
                    : 'diagnostic_skips';
                $assessmentRows[$response->task_key][$assessmentType]++;
                $assessmentRows[$response->task_key]['affected_learner_ids'][$run->learner_id] = true;
                $this->recordEvidence(
                    $topicRows[$task['topic']],
                    $classRows[$classKeyByLearner[$run->learner_id]],
                    $run->learner_id,
                    "assessment:{$response->id}",
                    'assessment_skips',
                    $classKeyByLearner[$run->learner_id],
                );
            }
        }

        $lessonRuns = $learnerIds->isEmpty()
            ? collect()
            : LessonRun::query()
                ->with('responses')
                ->whereIn('learner_id', $learnerIds)
                ->whereIn('lesson_key', array_keys(self::LESSONS))
                ->latest('id')
                ->get()
                ->unique(
                    fn (LessonRun $run): string => "{$run->learner_id}:{$run->lesson_key}",
                )
                ->values();

        foreach ($lessonRuns as $run) {
            $lesson = self::LESSONS[$run->lesson_key];

            foreach ($run->responses as $response) {
                $skipped = $this->isSkipped(
                    $response->response_type,
                    $response->decision,
                ) || $response->outcome === 'SKIPPED';
                $classKey = $classKeyByLearner[$run->learner_id];

                if ($skipped) {
                    $lessonRows[$run->lesson_key]['skipped_items']++;
                    $lessonRows[$run->lesson_key]['affected_learner_ids'][$run->learner_id] = true;
                    $this->recordEvidence(
                        $topicRows[$lesson['topic']],
                        $classRows[$classKey],
                        $run->learner_id,
                        "lesson:{$response->id}",
                        'lesson_skips',
                        $classKey,
                    );
                } elseif ($response->review_recommended) {
                    $lessonRows[$run->lesson_key]['review_recommended_items']++;
                    $lessonRows[$run->lesson_key]['affected_learner_ids'][$run->learner_id] = true;
                    $this->recordEvidence(
                        $topicRows[$lesson['topic']],
                        $classRows[$classKey],
                        $run->learner_id,
                        "lesson:{$response->id}",
                        'review_recommended_items',
                        $classKey,
                    );
                }
            }
        }

        $priorities = collect($topicRows)
            ->filter(fn (array $row): bool => count($row['evidence_keys']) > 0)
            ->sort(function (array $left, array $right): int {
                $affected = count($right['learner_ids']) <=> count($left['learner_ids']);
                $evidence = count($right['evidence_keys']) <=> count($left['evidence_keys']);

                if ($affected !== 0) {
                    return $affected;
                }

                return $evidence !== 0
                    ? $evidence
                    : ($left['order'] <=> $right['order']);
            })
            ->values()
            ->map(function (array $row, int $index): array {
                $affectedLearners = count($row['learner_ids']);
                $evidenceItems = count($row['evidence_keys']);

                return [
                    'rank' => $index + 1,
                    'key' => $row['key'],
                    'title' => $row['recommendation'],
                    'topic' => $row['title'],
                    'reason' => "{$affectedLearners} active "
                        .($affectedLearners === 1 ? 'learner has' : 'learners have')
                        ." {$evidenceItems} persisted "
                        .($evidenceItems === 1 ? 'evidence item' : 'evidence items')
                        .' for this instructional topic.',
                    'affected_learners' => $affectedLearners,
                    'evidence_items' => $evidenceItems,
                    'assessment_skips' => $row['assessment_skips'],
                    'lesson_skips' => $row['lesson_skips'],
                    'review_recommended_items' => $row['review_recommended_items'],
                    'affected_classes' => count($row['class_keys']),
                ];
            });

        $affectedLearners = $priorities
            ->flatMap(fn (array $priority): array => array_keys(
                $topicRows[$priority['key']]['learner_ids'],
            ))
            ->unique()
            ->count();

        return [
            'school' => [
                'id' => $administrator->school?->id,
                'name' => $administrator->school?->name,
            ],
            'generated_at' => now()->toIso8601String(),
            'read_only' => true,
            'rules_version' => 'school-instructional-insights-v1',
            'summary' => [
                'active_learners' => $learners->count(),
                'learners_with_evidence' => $affectedLearners,
                'assessment_skips' => collect($assessmentRows)
                    ->sum(fn (array $row): int => $row['diagnostic_skips'] + $row['final_skips']),
                'whole_diagnostic_skips' => $wholeDiagnosticSkips,
                'lesson_skips' => collect($lessonRows)->sum('skipped_items'),
                'review_recommended_items' => collect($lessonRows)
                    ->sum('review_recommended_items'),
                'teaching_priorities' => $priorities->count(),
            ],
            'priorities' => $priorities->all(),
            'assessment_breakdown' => collect($assessmentRows)
                ->map(fn (array $row): array => [
                    ...$row,
                    'affected_learners' => count($row['affected_learner_ids']),
                ])
                ->map(function (array $row): array {
                    unset($row['affected_learner_ids']);

                    return $row;
                })
                ->values()
                ->all(),
            'lesson_breakdown' => collect($lessonRows)
                ->map(fn (array $row): array => [
                    ...$row,
                    'affected_learners' => count($row['affected_learner_ids']),
                ])
                ->map(function (array $row): array {
                    unset($row['affected_learner_ids']);

                    return $row;
                })
                ->sortBy('order')
                ->values()
                ->all(),
            'class_breakdown' => collect($classRows)
                ->map(fn (array $row): array => [
                    ...$row,
                    'affected_learners' => count($row['affected_learner_ids']),
                    'evidence_items' => count($row['evidence_keys']),
                ])
                ->map(function (array $row): array {
                    unset($row['affected_learner_ids'], $row['evidence_keys']);

                    return $row;
                })
                ->sortBy([
                    ['grade_level', 'asc'],
                    ['section', 'asc'],
                    ['key', 'asc'],
                ])
                ->values()
                ->all(),
        ];
    }

    /** @param array<string, mixed> $topic
     * @param  array<string, mixed>  $class
     */
    private function recordEvidence(
        array &$topic,
        array &$class,
        int $learnerId,
        string $evidenceKey,
        string $kind,
        string $classKey,
    ): void {
        $topic[$kind]++;
        $topic['learner_ids'][$learnerId] = true;
        $topic['evidence_keys'][$evidenceKey] = true;
        $topic['class_keys'][$classKey] = true;
        $class[$kind]++;
        $class['affected_learner_ids'][$learnerId] = true;
        $class['evidence_keys'][$evidenceKey] = true;
    }

    private function isSkipped(?string $responseType, ?string $decision): bool
    {
        return $responseType === 'skipped' || $decision === 'SKIPPED';
    }

    private function classKey(Learner $learner): string
    {
        return implode(':', [
            $learner->teacher_id ?? 'unassigned',
            $learner->grade_level ?? 'unknown',
            $learner->section ?? 'unknown',
        ]);
    }
}
