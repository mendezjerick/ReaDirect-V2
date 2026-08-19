<?php

namespace App\Services;

use App\Models\GameCatalog;
use Illuminate\Validation\ValidationException;

final class LearnerGameSavePayloadValidator
{
    private const GAME_ALPHA_RULESET = 'game-alpha-score-v1';

    private const GAME_ONE_CONTENT_VERSION = 'bilingual-v1';

    private const GAME_TWO_RULESET = 'v1';

    private const MAX_SCORE = 2_147_483_647;

    private const MAX_ALPHA_STAGE = 10_000;

    private const MAX_GAME_TWO_STAGES = 4;

    private const MAX_GAME_ONE_COLLECTION = 512;

    private const MAX_GAME_ONE_COORDINATE = 1_000_000;

    /**
     * @param  array<string, mixed>  $state
     */
    public function validate(
        GameCatalog $game,
        int $saveSchemaVersion,
        array $state,
    ): void {
        if ($saveSchemaVersion !== 1) {
            $this->fail('The game save schema version is not supported.');
        }

        match ($game->game_key) {
            GameCatalog::GAME_ALPHA_KEY => $this->validateAlpha($state),
            GameCatalog::GAME_ONE_KEY => $this->validateGameOne($state),
            GameCatalog::GAME_TWO_KEY => $this->validateGameTwo($state),
            default => $this->fail('The game save contract is not supported.'),
        };
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function validateAlpha(array $state): void
    {
        $this->assertExactKeys($state, [
            'rulesetVersion',
            'personalBestScore',
            'highestStageReached',
        ]);

        if ($state['rulesetVersion'] !== self::GAME_ALPHA_RULESET) {
            $this->fail('The Game Alpha ruleset version is not supported.');
        }

        $this->assertBoundedInteger($state['personalBestScore'], 0, self::MAX_SCORE, 'personalBestScore');
        $this->assertBoundedInteger($state['highestStageReached'], 1, self::MAX_ALPHA_STAGE, 'highestStageReached');
    }

    /**
     * Game One's TypeScript hydrator remains the detailed content authority.
     * This layer validates the stable v1 envelope and bounded primitives while
     * allowing legitimate content additions inside that already-versioned save.
     *
     * @param  array<string, mixed>  $state
     */
    private function validateGameOne(array $state): void
    {
        $this->assertExactKeys($state, [
            'contentVersionId',
            'mission',
            'exploration',
            'tutorial',
            'characterId',
            'shopTask',
        ]);

        if ($state['contentVersionId'] !== self::GAME_ONE_CONTENT_VERSION) {
            $this->fail('The Game One content version is not supported.');
        }

        foreach (['mission', 'exploration', 'tutorial', 'shopTask'] as $key) {
            if (! is_array($state[$key]) || array_is_list($state[$key])) {
                $this->fail("The Game One {$key} state must be an object.");
            }
        }

        if (! in_array($state['characterId'], [
            'yato',
            'blue-hair-explorer',
            'iruma',
            'luffy',
            'frieren',
        ], true)) {
            $this->fail('The Game One character is not supported.');
        }

        $mission = $state['mission'];
        $this->assertOptionalEnum($mission, 'language', ['en', 'fil']);
        $this->assertOptionalInteger($mission, 'missionIndex', 0, 5);
        $this->assertOptionalInteger($mission, 'currentQuestionIndex', 0, 128);
        $this->assertOptionalInteger($mission, 'readingPageIndex', 0, 128);
        $this->assertOptionalInteger($mission, 'actionAttempts', 0, 128);
        $this->assertOptionalInteger($mission, 'helpRequestCount', 0, 128);
        $this->assertOptionalInteger($mission, 'comprehensionRestartCount', 0, 128);
        $this->assertOptionalInteger($mission, 'readingHeartsRemaining', 0, 10);
        $this->assertOptionalList($mission, 'rounds', self::MAX_GAME_ONE_COLLECTION);
        $this->assertOptionalList($mission, 'completedQuestionIds', self::MAX_GAME_ONE_COLLECTION);
        $this->assertOptionalList($mission, 'savedQuestionIds', self::MAX_GAME_ONE_COLLECTION);
        $this->assertOptionalList($mission, 'completedMissionIds', 6);
        $this->assertOptionalMap($mission, 'attemptsByQuestion', self::MAX_GAME_ONE_COLLECTION);
        $this->assertOptionalMap($mission, 'incorrectSubmissionsByQuestion', self::MAX_GAME_ONE_COLLECTION);

        $exploration = $state['exploration'];
        $this->assertOptionalInteger($exploration, 'version', 1, 1);
        if (array_key_exists('safePosition', $exploration)) {
            $position = $exploration['safePosition'];
            if (! is_array($position) || array_is_list($position)) {
                $this->fail('The Game One exploration position must be an object.');
            }
            $this->assertOptionalFiniteNumber($position, 'x', self::MAX_GAME_ONE_COORDINATE);
            $this->assertOptionalFiniteNumber($position, 'y', self::MAX_GAME_ONE_COORDINATE);
        }
        foreach ([
            'discoveredFishingSpotIds',
            'completedInteractionIds',
            'caughtResultIds',
        ] as $key) {
            $this->assertOptionalList($exploration, $key, self::MAX_GAME_ONE_COLLECTION);
        }
        foreach (['fishingParticipation', 'fishingAttempts'] as $key) {
            $this->assertOptionalInteger($exploration, $key, 0, self::MAX_SCORE);
        }

        $tutorial = $state['tutorial'];
        foreach (['active', 'skipConfirmationOpen', 'finished'] as $key) {
            $this->assertOptionalBoolean($tutorial, $key);
        }
        $this->assertOptionalList($tutorial, 'completedSteps', 32);
        if (array_key_exists('step', $tutorial) && ! is_string($tutorial['step'])) {
            $this->fail('The Game One tutorial step is invalid.');
        }

        $shopTask = $state['shopTask'];
        $this->assertOptionalEnum($shopTask, 'stage', [
            'not-started',
            'searching',
            'paper-found',
            'completed',
        ]);
        $this->assertOptionalBoolean($shopTask, 'hintUsed');
        $this->assertOptionalList($shopTask, 'inspectedIds', 16);
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function validateGameTwo(array $state): void
    {
        $this->assertExactKeys($state, [
            'rulesetVersion',
            'completedStageIds',
            'bestScoresByStage',
        ]);

        if ($state['rulesetVersion'] !== self::GAME_TWO_RULESET) {
            $this->fail('The OtterTale ruleset version is not supported.');
        }

        $completed = $state['completedStageIds'];
        if (! is_array($completed) || ! array_is_list($completed) || count($completed) > self::MAX_GAME_TWO_STAGES) {
            $this->fail('The OtterTale completed stage list is invalid.');
        }

        $knownStages = [0, 1, 2, 3];
        $completedStages = [];
        foreach ($completed as $stageId) {
            if (! is_int($stageId) || ! in_array($stageId, $knownStages, true)) {
                $this->fail('The OtterTale completed stage list contains an invalid stage.');
            }
            if (in_array($stageId, $completedStages, true)) {
                $this->fail('The OtterTale completed stage list contains a duplicate.');
            }
            $completedStages[] = $stageId;
        }

        $scores = $state['bestScoresByStage'];
        if (! is_array($scores) || (count($scores) > 0 && array_is_list($scores)) || count($scores) > self::MAX_GAME_TWO_STAGES) {
            $this->fail('The OtterTale best-score map is invalid.');
        }

        foreach ($scores as $stageId => $score) {
            $stageIdText = (string) $stageId;
            if ((! is_int($stageId) && ! is_string($stageId)) || ! ctype_digit($stageIdText) || ! in_array((int) $stageIdText, $knownStages, true)) {
                $this->fail('The OtterTale best-score map contains an invalid stage.');
            }
            if (! in_array((int) $stageIdText, $completedStages, true)) {
                $this->fail('OtterTale scores may only be stored for completed stages.');
            }
            $this->assertBoundedInteger($score, 0, self::MAX_SCORE, "bestScoresByStage.{$stageIdText}");
        }
    }

    /**
     * @param  array<string, mixed>  $state
     * @param  list<string>  $expected
     */
    private function assertExactKeys(array $state, array $expected): void
    {
        $actual = array_keys($state);
        sort($actual);
        $sortedExpected = $expected;
        sort($sortedExpected);

        if ($actual !== $sortedExpected) {
            $this->fail('The game save contains unknown or missing fields.');
        }
    }

    private function assertBoundedInteger(mixed $value, int $minimum, int $maximum, string $field): void
    {
        if (! is_int($value) || $value < $minimum || $value > $maximum) {
            $this->fail("The {$field} value is invalid.");
        }
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function assertOptionalInteger(array $state, string $field, int $minimum, int $maximum): void
    {
        if (array_key_exists($field, $state)) {
            $this->assertBoundedInteger($state[$field], $minimum, $maximum, $field);
        }
    }

    /**
     * @param  array<string, mixed>  $state
     * @param  list<string>  $allowed
     */
    private function assertOptionalEnum(array $state, string $field, array $allowed): void
    {
        if (array_key_exists($field, $state) && ! in_array($state[$field], $allowed, true)) {
            $this->fail("The {$field} value is invalid.");
        }
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function assertOptionalBoolean(array $state, string $field): void
    {
        if (array_key_exists($field, $state) && ! is_bool($state[$field])) {
            $this->fail("The {$field} value is invalid.");
        }
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function assertOptionalFiniteNumber(array $state, string $field, float $absoluteMaximum): void
    {
        if (! array_key_exists($field, $state)) {
            return;
        }

        $value = $state[$field];
        if ((! is_int($value) && ! is_float($value)) || ! is_finite((float) $value) || abs((float) $value) > $absoluteMaximum) {
            $this->fail("The {$field} value is invalid.");
        }
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function assertOptionalList(array $state, string $field, int $maximum): void
    {
        if (! array_key_exists($field, $state)) {
            return;
        }

        if (! is_array($state[$field]) || ! array_is_list($state[$field]) || count($state[$field]) > $maximum) {
            $this->fail("The {$field} collection is invalid.");
        }
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function assertOptionalMap(array $state, string $field, int $maximum): void
    {
        if (! array_key_exists($field, $state)) {
            return;
        }

        if (! is_array($state[$field]) || (count($state[$field]) > 0 && array_is_list($state[$field])) || count($state[$field]) > $maximum) {
            $this->fail("The {$field} map is invalid.");
        }
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['state' => [$message]]);
    }
}
