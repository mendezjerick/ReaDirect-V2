<?php

namespace App\Services;

use App\Models\AssessmentRun;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use DomainException;
use LogicException;

final class ActivitySpeechManifestService
{
    public function __construct(
        private readonly LearnerSpeechPolicy $speechPolicy,
    ) {}

    private const PART_TWO_ASSESSMENT_STAGES = [
        'story-selection',
        'task-3a',
        'task-3b',
        'passage-results',
        'part-2-results',
        'assessment-complete',
    ];

    /**
     * @return array{
     *     activity: string,
     *     published_groups: list<string>,
     *     published_speech_keys: list<string>,
     *     runtime_profiles: list<string>,
     *     requires_runtime: bool
     * }
     */
    public function forSession(LearnerSession $session): array
    {
        return $this->forActivity($this->activityKeyForSession($session));
    }

    /**
     * @return array{
     *     activity: string,
     *     published_groups: list<string>,
     *     published_speech_keys: list<string>,
     *     runtime_profiles: list<string>,
     *     requires_runtime: bool
     * }
     */
    public function forActivity(string $activityKey): array
    {
        $manifests = config('speech.activity_speech_manifests', []);
        $manifest = $manifests[$activityKey] ?? null;

        if (! is_array($manifest)) {
            throw new DomainException("No speech manifest is available for {$activityKey}.");
        }

        $publishedGroups = $this->stringList(
            $manifest['published_groups'] ?? null,
            "{$activityKey}.published_groups",
        );
        $runtimeProfiles = $this->stringList(
            $manifest['runtime_profiles'] ?? null,
            "{$activityKey}.runtime_profiles",
        );

        if (str_starts_with($activityKey, 'assessment-') && $runtimeProfiles !== []) {
            throw new LogicException("Assessment manifest {$activityKey} cannot declare runtime profiles.");
        }

        $allowedProfiles = $this->stringList(
            config('speech.tts_reference_profiles', []),
            'tts_reference_profiles',
        );
        $unknownProfiles = array_values(array_diff($runtimeProfiles, $allowedProfiles));

        if ($unknownProfiles !== []) {
            throw new LogicException(
                "Speech manifest {$activityKey} contains unknown runtime profiles: "
                .implode(', ', $unknownProfiles).'.',
            );
        }

        $configuredGroups = config('speech.published_speech_groups', []);
        $knownSpeechKeys = $this->knownPublishedSpeechKeys();
        $publishedSpeechKeys = [];

        foreach ($publishedGroups as $group) {
            $speechKeys = $configuredGroups[$group] ?? null;

            if (! is_array($speechKeys)) {
                throw new LogicException(
                    "Speech manifest {$activityKey} references unknown published group {$group}.",
                );
            }

            $speechKeys = $this->stringList($speechKeys, "published_speech_groups.{$group}");
            $unknownSpeechKeys = array_values(array_diff($speechKeys, $knownSpeechKeys));

            if ($unknownSpeechKeys !== []) {
                throw new LogicException(
                    "Published speech group {$group} contains unknown speech keys: "
                    .implode(', ', $unknownSpeechKeys).'.',
                );
            }

            $publishedSpeechKeys = [...$publishedSpeechKeys, ...$speechKeys];
        }

        $publishedSpeechKeys = array_values(array_unique($publishedSpeechKeys));

        $effectiveRuntimeProfiles = $this->speechPolicy->runtimeProfiles($runtimeProfiles);

        return [
            'activity' => $activityKey,
            'published_groups' => $publishedGroups,
            'published_speech_keys' => $publishedSpeechKeys,
            'runtime_profiles' => $effectiveRuntimeProfiles,
            'requires_runtime' => $effectiveRuntimeProfiles !== [],
        ];
    }

    private function activityKeyForSession(LearnerSession $session): string
    {
        $session->loadMissing('learner.progressState');

        if ($session->session_type === 'portal') {
            $portalRun = LearnerPortalRun::query()
                ->where('learner_id', $session->learner_id)
                ->where('status', LearnerPortalRun::ACTIVE_STATUS)
                ->where('expires_at', '>', now())
                ->latest('started_at')
                ->first();

            if ($portalRun === null) {
                throw new DomainException('The portal session has no active portal destination.');
            }

            $activityKey = config("speech.portal_activity_map.{$portalRun->target_key}");

            if (! is_string($activityKey) || $activityKey === '') {
                throw new DomainException(
                    "No activity speech destination is mapped for portal target {$portalRun->target_key}.",
                );
            }

            return $activityKey;
        }

        $progress = $session->learner->progressState;
        $stage = $progress?->stage ?? LearnerProgressState::BASELINE_STAGE;

        if (in_array($stage, [
            LearnerProgressState::BASELINE_STAGE,
            LearnerProgressState::FINAL_ASSESSMENT_STAGE,
            LearnerProgressState::READING_JOURNEY_COMPLETE_STAGE,
        ], true)) {
            $assessmentType = $stage === LearnerProgressState::BASELINE_STAGE
                ? AssessmentRun::TYPE_DIAGNOSTIC
                : AssessmentRun::TYPE_FINAL;
            $activeAssessmentStage = AssessmentRun::query()
                ->where('learner_id', $session->learner_id)
                ->where('assessment_type', $assessmentType)
                ->where(function ($query) use ($assessmentType): void {
                    $query->where('status', AssessmentRun::STATUS_ACTIVE);
                    if ($assessmentType === AssessmentRun::TYPE_FINAL) {
                        $query->orWhere(function ($completed): void {
                            $completed
                                ->where('status', AssessmentRun::STATUS_COMPLETED)
                                ->where('stage', 'assessment-complete');
                        });
                    }
                })
                ->latest('updated_at')
                ->value('stage');

            if (is_string($activeAssessmentStage)
                && in_array($activeAssessmentStage, self::PART_TWO_ASSESSMENT_STAGES, true)) {
                return $assessmentType === AssessmentRun::TYPE_FINAL
                    ? 'assessment-final-part-two'
                    : 'assessment-part-two';
            }

            return 'assessment-part-one';
        }

        if ($stage === 'required_lessons'
            && (int) $progress?->current_required_lesson_order === 1) {
            return 'lesson-1';
        }

        if ($stage === 'required_lessons'
            && (int) $progress?->current_required_lesson_order === 2) {
            return 'lesson-2';
        }

        if ($stage === 'required_lessons'
            && (int) $progress?->current_required_lesson_order === 3) {
            return 'lesson-3';
        }

        if ($stage === 'required_lessons'
            && (int) $progress?->current_required_lesson_order === 4) {
            return 'lesson-4';
        }

        if ($stage === 'required_lessons'
            && (int) $progress?->current_required_lesson_order === 5) {
            return 'lesson-5';
        }

        if ($stage === 'required_lessons'
            && (int) $progress?->current_required_lesson_order === 6) {
            return 'lesson-6';
        }

        throw new DomainException(
            "No activity speech destination is available for learner stage {$stage}.",
        );
    }

    /** @return list<string> */
    private function knownPublishedSpeechKeys(): array
    {
        $keys = array_keys(config('speech.clara_lines', []));
        $ordinals = config('speech.assessment_item_cues.ordinals', []);

        foreach (config('speech.assessment_item_cues.tasks', []) as $task => $_definition) {
            foreach (array_keys($ordinals) as $position) {
                $keys[] = "assessment-{$task}-item-{$position}";
            }
        }

        return array_values(array_unique($keys));
    }

    /** @return list<string> */
    private function stringList(mixed $value, string $field): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw new LogicException("Speech configuration {$field} must be a list.");
        }

        foreach ($value as $entry) {
            if (! is_string($entry) || trim($entry) === '') {
                throw new LogicException(
                    "Speech configuration {$field} must contain only non-empty strings.",
                );
            }
        }

        if (count($value) !== count(array_unique($value))) {
            throw new LogicException("Speech configuration {$field} cannot contain duplicates.");
        }

        return array_values($value);
    }
}
