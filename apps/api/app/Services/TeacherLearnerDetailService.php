<?php

namespace App\Services;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\LessonItemAttempt;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use Illuminate\Support\Collection;

final class TeacherLearnerDetailService
{
    public function __construct(
        private readonly LearnerReadingPathService $readingPaths,
    ) {}

    /** @var array<string, array{order: int, title: string}> */
    private const LESSONS = [
        'required-lesson-1' => ['order' => 1, 'title' => 'Letter names'],
        'required-lesson-2' => ['order' => 2, 'title' => 'Word reading'],
        'required-lesson-3' => ['order' => 3, 'title' => 'Phrase reading'],
        'required-lesson-4' => ['order' => 4, 'title' => 'Sentence reading'],
        'required-lesson-5' => ['order' => 5, 'title' => 'Passage reading'],
        'required-lesson-6' => ['order' => 6, 'title' => 'Comprehension'],
    ];

    /** @var array<string, string> */
    private const ASSESSMENT_TASKS = [
        'task-1a' => 'Letter Pronunciation',
        'task-2a' => 'Rhyme Check',
        'task-2b' => 'Word Pronunciation',
        'task-3a' => 'Passage Reading',
        'task-3b' => 'Comprehension Check',
    ];

    /** @return array<string, mixed> */
    public function build(Learner $learner): array
    {
        $learner->loadMissing('school:id,name');

        $progress = LearnerProgressState::query()
            ->where('learner_id', $learner->id)
            ->first();
        $readingPath = $this->readingPaths->snapshot($learner, $progress);

        $assessmentRuns = AssessmentRun::query()
            ->with(['responses' => fn ($query) => $query->orderBy('item_order')])
            ->where('learner_id', $learner->id)
            ->latest('id')
            ->get()
            ->unique('assessment_type')
            ->keyBy('assessment_type');

        $lessonRuns = LessonRun::query()
            ->with([
                'responses' => fn ($query) => $query
                    ->with('attempts')
                    ->orderBy('mission_key')
                    ->orderBy('item_order'),
            ])
            ->where('learner_id', $learner->id)
            ->latest('id')
            ->get()
            ->unique('lesson_key')
            ->keyBy('lesson_key');

        $assessmentSummaries = [
            AssessmentRun::TYPE_DIAGNOSTIC => $this->assessmentSummary(
                $assessmentRuns->get(AssessmentRun::TYPE_DIAGNOSTIC),
            ),
            AssessmentRun::TYPE_FINAL => $this->assessmentSummary(
                $assessmentRuns->get(AssessmentRun::TYPE_FINAL),
            ),
        ];

        $skippedAssessmentItems = $assessmentRuns
            ->flatMap(fn (AssessmentRun $run): Collection => $run->responses
                ->where('response_type', 'skipped')
                ->map(fn (AssessmentResponse $response): array => [
                    'assessment_type' => $run->assessment_type,
                    'assessment_label' => $run->assessment_type === AssessmentRun::TYPE_FINAL
                        ? 'Final Assessment'
                        : 'Diagnostic Assessment',
                    'task_key' => $response->task_key,
                    'task_label' => self::ASSESSMENT_TASKS[$response->task_key]
                        ?? $response->task_key,
                    'item_key' => $response->item_key,
                    'item_order' => (int) $response->item_order,
                    'item_label' => $this->assessmentItemLabel($run, $response),
                    'recorded_at' => $response->created_at?->toIso8601String(),
                ]))
            ->values();

        $lessons = collect(self::LESSONS)
            ->map(function (array $definition, string $lessonKey) use (
                $lessonRuns,
            ): array {
                $run = $lessonRuns->get($lessonKey);

                return $this->lessonSummary(
                    $lessonKey,
                    $definition,
                    $run instanceof LessonRun ? $run : null,
                );
            })
            ->sortBy('order')
            ->values();

        $recommendations = collect();
        foreach ($skippedAssessmentItems as $item) {
            $recommendations->push([
                'key' => implode(':', [
                    'assessment-skip',
                    $item['assessment_type'],
                    $item['task_key'],
                    $item['item_key'],
                ]),
                'kind' => 'skipped_assessment_item',
                'title' => "Review skipped {$item['task_label']} item",
                'reason' => "{$item['assessment_label']} item {$item['item_order']} was explicitly skipped.",
                'evidence' => [
                    'assessment_type' => $item['assessment_type'],
                    'task_key' => $item['task_key'],
                    'item_key' => $item['item_key'],
                    'decision' => 'SKIPPED',
                ],
            ]);
        }

        foreach ($lessons as $lesson) {
            foreach ($lesson['items'] as $item) {
                if (! $item['review_recommended'] && $item['outcome'] !== 'SKIPPED') {
                    continue;
                }

                $reason = $item['outcome'] === 'SKIPPED'
                    ? "Lesson {$lesson['order']} item {$item['item_order']} was explicitly skipped."
                    : $this->reviewReason($lesson, $item);

                $recommendations->push([
                    'key' => implode(':', [
                        'lesson-review',
                        $lesson['lesson_key'],
                        $item['mission_key'],
                        $item['item_key'],
                    ]),
                    'kind' => $item['outcome'] === 'SKIPPED'
                        ? 'skipped_lesson_item'
                        : 'persisted_lesson_review',
                    'title' => "Revisit {$lesson['title']} item {$item['item_order']}",
                    'reason' => $reason,
                    'evidence' => [
                        'lesson_key' => $lesson['lesson_key'],
                        'mission_key' => $item['mission_key'],
                        'item_key' => $item['item_key'],
                        'outcome' => $item['outcome'],
                        'diagnosis_key' => $item['diagnosis_key'],
                        'highest_scaffold_used' => $item['highest_scaffold_used'],
                        'practice_attempt_count' => $item['practice_attempt_count'],
                    ],
                ]);
            }
        }

        return [
            'learner' => [
                'id' => $learner->id,
                'learner_code' => $learner->learner_code,
                'full_name' => $this->fullName($learner),
                'first_name' => $learner->first_name,
                'middle_name' => $learner->middle_name,
                'last_name' => $learner->last_name,
                'suffix' => $learner->suffix,
                'lrn' => $learner->lrn,
                'is_active' => (bool) $learner->is_active,
                'created_at' => $learner->created_at?->toIso8601String(),
            ],
            'class_context' => [
                'school' => $learner->school ? [
                    'id' => $learner->school->id,
                    'name' => $learner->school->name,
                ] : null,
                'grade_level' => $learner->grade_level,
                'section' => $learner->section,
            ],
            'progression' => [
                'recorded' => $progress !== null,
                'stage' => $progress?->stage
                    ?? LearnerProgressState::BASELINE_STAGE,
                'stage_label' => $this->stageLabel(
                    $progress?->stage
                        ?? LearnerProgressState::BASELINE_STAGE,
                    $readingPath,
                ),
                'current_required_lesson_order' => $progress?->current_required_lesson_order,
                'diagnostic_completed_at' => $progress?->diagnostic_completed_at?->toIso8601String(),
                'final_assessment_completed_at' => $progress?->final_assessment_completed_at?->toIso8601String(),
                'last_confirmed_at' => $progress?->last_confirmed_at?->toIso8601String(),
            ],
            'reading_path' => $readingPath,
            'assessments' => $assessmentSummaries,
            'skipped_assessment_items' => $skippedAssessmentItems->all(),
            'lessons' => $lessons->all(),
            'recommendations' => $recommendations->values()->all(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /** @return array<string, mixed>|null */
    private function assessmentSummary(?AssessmentRun $run): ?array
    {
        if (! $run) {
            return null;
        }

        return [
            'run_id' => $run->id,
            'assessment_type' => $run->assessment_type,
            'status' => $run->status,
            'completion_mode' => $run->completion_mode
                ?? AssessmentRun::COMPLETION_MODE_STANDARD,
            'stage' => $run->stage,
            'part_one_branch' => $run->part_one_branch,
            'task_scores' => [
                'task_1a' => $run->task_1a_score,
                'task_2a' => $run->task_2a_score,
                'task_2b' => $run->task_2b_score,
            ],
            'part_one_score' => $run->part_one_score,
            'part_one_level' => $run->part_one_level,
            'reading_accuracy_percent' => $run->reading_accuracy_percent,
            'comprehension_score' => $run->comprehension_score,
            'comprehension_percent' => $run->comprehension_percent,
            'final_reading_score' => $run->final_reading_score,
            'final_reading_profile' => $run->final_reading_profile,
            'responses_recorded' => $run->responses->count(),
            'skipped_items' => $run->responses
                ->where('response_type', 'skipped')
                ->count(),
            'started_at' => $run->created_at?->toIso8601String(),
            'part_one_completed_at' => $run->part_one_completed_at?->toIso8601String(),
            'part_two_completed_at' => $run->part_two_completed_at?->toIso8601String(),
            'completed_at' => $run->assessment_completed_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array{order: int, title: string}  $definition
     * @return array<string, mixed>
     */
    private function lessonSummary(
        string $lessonKey,
        array $definition,
        ?LessonRun $run,
    ): array {
        if (! $run) {
            return [
                'lesson_key' => $lessonKey,
                'order' => $definition['order'],
                'title' => $definition['title'],
                'status' => 'not_started',
                'current_mission_key' => null,
                'current_item_index' => null,
                'items_total' => 0,
                'items_recorded' => 0,
                'completed_at' => null,
                'performance' => $this->emptyLessonPerformance(),
                'items' => [],
            ];
        }

        $items = $run->responses
            ->map(fn (LessonResponse $response): array => $this->lessonItem(
                $run,
                $response,
            ))
            ->values();

        return [
            'lesson_key' => $lessonKey,
            'order' => $definition['order'],
            'title' => $definition['title'],
            'status' => $run->status,
            'current_mission_key' => $run->mission_key,
            'current_item_index' => (int) $run->current_item_index,
            'items_total' => $this->snapshotItemCount($run->content_snapshot),
            'items_recorded' => $run->responses->whereNotNull('outcome')->count(),
            'completed_at' => $run->completed_at?->toIso8601String(),
            'performance' => [
                'independent_correct' => $run->responses
                    ->where('outcome', 'INDEPENDENT_CORRECT')->count(),
                'supported_correct' => $run->responses
                    ->where('outcome', 'SUPPORTED_CORRECT')->count(),
                'demonstrated' => $run->responses
                    ->where('outcome', 'DEMONSTRATED')->count(),
                'not_yet_correct' => $run->responses
                    ->where('outcome', 'NOT_YET_CORRECT')->count(),
                'unscorable_audio' => $run->responses
                    ->where('outcome', 'UNSCORABLE_AUDIO')->count(),
                'skipped' => $run->responses
                    ->where('outcome', 'SKIPPED')->count(),
                'academic_attempts' => $run->responses
                    ->sum('academic_attempt_count'),
                'technical_retries' => $run->responses
                    ->sum('technical_retry_count'),
                'practice_attempts' => $items
                    ->sum('practice_attempt_count'),
                'review_recommended' => $run->responses
                    ->where('review_recommended', true)->count(),
            ],
            'items' => $items->all(),
        ];
    }

    /** @return array<string, int> */
    private function emptyLessonPerformance(): array
    {
        return [
            'independent_correct' => 0,
            'supported_correct' => 0,
            'demonstrated' => 0,
            'not_yet_correct' => 0,
            'unscorable_audio' => 0,
            'skipped' => 0,
            'academic_attempts' => 0,
            'technical_retries' => 0,
            'practice_attempts' => 0,
            'review_recommended' => 0,
        ];
    }

    /** @return array<string, mixed> */
    private function lessonItem(
        LessonRun $run,
        LessonResponse $response,
    ): array {
        $attempts = $response->attempts
            ->map(function (LessonItemAttempt $attempt): array {
                $classification = (string) $attempt->audio_classification;
                $incorrect = in_array($classification, [
                    LessonTeachingStateMachine::CLASS_CLEAR_INCORRECT,
                    'CHOICE_INCORRECT',
                ], true);

                return [
                    'attempt_id' => $attempt->id,
                    'attempt_sequence' => (int) $attempt->attempt_sequence,
                    'attempt_kind' => $attempt->attempt_kind,
                    'academic_attempt_number' => $attempt->academic_attempt_number,
                    'scaffold_level' => $attempt->scaffold_level,
                    'classification' => $classification,
                    'decision' => $attempt->decision,
                    'final_transcript' => $attempt->final_transcript,
                    'selected_response' => data_get(
                        $attempt->evidence,
                        'selected_text',
                    ),
                    'incorrect' => $incorrect,
                    'recorded_at' => $attempt->created_at?->toIso8601String(),
                ];
            })
            ->values();

        return [
            'response_id' => $response->id,
            'mission_key' => $response->mission_key,
            'item_key' => $response->item_key,
            'item_order' => (int) $response->item_order,
            'target_label' => $this->lessonItemLabel($run, $response),
            'response_type' => $response->response_type,
            'decision' => $response->decision,
            'outcome' => $response->outcome,
            'final_transcript' => $response->final_transcript,
            'academic_attempt_count' => (int) $response->academic_attempt_count,
            'technical_retry_count' => (int) $response->technical_retry_count,
            'highest_scaffold_used' => $response->highest_scaffold_used,
            'independent_mastery' => (bool) $response->independent_mastery,
            'diagnosis_key' => $response->diagnosis_key,
            'review_recommended' => (bool) $response->review_recommended,
            'practice_attempt_count' => $attempts
                ->where('incorrect', true)
                ->whereIn('attempt_kind', [
                    LessonItemAttempt::KIND_INDEPENDENT,
                    LessonItemAttempt::KIND_GUIDED,
                ])
                ->count(),
            'attempts' => $attempts->all(),
            'completed_at' => $response->completed_at?->toIso8601String(),
        ];
    }

    private function assessmentItemLabel(
        AssessmentRun $run,
        AssessmentResponse $response,
    ): string {
        $item = collect($run->content_snapshot[$response->task_key] ?? [])
            ->first(fn (mixed $candidate): bool => is_array($candidate)
                && ($candidate['item_key'] ?? null) === $response->item_key);

        if (! is_array($item)) {
            return sprintf(
                '%s item %d',
                self::ASSESSMENT_TASKS[$response->task_key]
                    ?? $response->task_key,
                $response->item_order,
            );
        }

        return match ($response->task_key) {
            'task-2a' => trim(implode(' / ', array_filter([
                $item['word_one'] ?? null,
                $item['word_two'] ?? null,
            ]))),
            'task-3b' => (string) ($item['question_text'] ?? $response->item_key),
            'task-3a' => (string) ($item['title'] ?? $response->item_key),
            default => (string) ($item['display_text'] ?? $response->item_key),
        };
    }

    private function lessonItemLabel(
        LessonRun $run,
        LessonResponse $response,
    ): string {
        $item = collect($run->content_snapshot[$response->mission_key] ?? [])
            ->first(fn (mixed $candidate): bool => is_array($candidate)
                && ($candidate['content_id'] ?? null) === $response->item_key);

        if (! is_array($item)) {
            return "Item {$response->item_order}";
        }

        if ($run->lesson_key === 'required-lesson-6') {
            return (string) ($item['question_audio_text']
                ?? $item['display_text']
                ?? "Item {$response->item_order}");
        }

        return (string) ($item['display_text']
            ?? $item['title']
            ?? "Item {$response->item_order}");
    }

    /** @param array<string, mixed> $snapshot */
    private function snapshotItemCount(array $snapshot): int
    {
        return collect($snapshot)
            ->filter(fn (mixed $mission): bool => is_array($mission))
            ->sum(fn (array $mission): int => count($mission));
    }

    /** @param array<string, mixed> $lesson
     * @param  array<string, mixed>  $item
     */
    private function reviewReason(array $lesson, array $item): string
    {
        $parts = [
            "The saved outcome for Lesson {$lesson['order']} item {$item['item_order']} is "
                .$this->humanize((string) ($item['outcome'] ?? 'not yet complete')).'.',
        ];

        if (($item['highest_scaffold_used'] ?? 'none') !== 'none') {
            $parts[] = 'Highest recorded support: '
                .$this->humanize((string) $item['highest_scaffold_used']).'.';
        }

        if (($item['practice_attempt_count'] ?? 0) > 0) {
            $parts[] = "{$item['practice_attempt_count']} clear incorrect practice "
                .($item['practice_attempt_count'] === 1 ? 'attempt was' : 'attempts were')
                .' persisted.';
        }

        return implode(' ', $parts);
    }

    private function stageLabel(
        string $stage,
        array $readingPath,
    ): string {
        return match ($stage) {
            LearnerProgressState::BASELINE_STAGE => 'Diagnostic Assessment not started',
            'diagnostic_assessment' => 'Diagnostic Assessment in progress',
            'required_lessons' => "Reading lessons · {$readingPath['completed_lesson_count']} of 6 complete",
            LearnerProgressState::FINAL_ASSESSMENT_STAGE => 'Final Assessment ready',
            LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE => 'Reading journey complete',
            default => $this->humanize($stage),
        };
    }

    private function humanize(string $value): string
    {
        return ucfirst(strtolower(str_replace('_', ' ', $value)));
    }

    private function fullName(Learner $learner): string
    {
        return implode(' ', array_filter([
            $learner->first_name,
            $learner->middle_name,
            $learner->last_name,
            $learner->suffix,
        ]));
    }
}
