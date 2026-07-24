<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

final class LessonContentCatalog
{
    /** @return array<string, list<array<string, string>>> */
    public function lessonOneSnapshot(int $learnerId): array
    {
        $rows = $this->readLetters();
        $scope = 'required.lesson-1.letter-targets';
        [$cycle, $used] = $this->exposureState($learnerId, $scope);
        $available = array_values(array_filter($rows, fn (array $row): bool => ! in_array($row['target_key'], $used, true)));
        $contextEligible = array_values(array_filter($available, fn (array $row): bool => $row['eligible_mission_2'] === 'true' && $row['eligible_mission_3'] === 'true'));

        if (count($available) < 15 || count($contextEligible) < 10) {
            $cycle++;
            $available = $rows;
            $contextEligible = array_values(array_filter($available, fn (array $row): bool => $row['eligible_mission_2'] === 'true' && $row['eligible_mission_3'] === 'true'));
        }

        shuffle($contextEligible);
        $contextSelection = array_slice($contextEligible, 0, 10);
        $contextKeys = array_column($contextSelection, 'target_key');
        $missionOnePool = array_values(array_filter($available, fn (array $row): bool => ! in_array($row['target_key'], $contextKeys, true)));
        shuffle($missionOnePool);
        $missionOne = array_slice($missionOnePool, 0, 5);

        if (count($missionOne) < 5 || count($contextSelection) < 10) {
            throw new RuntimeException('Lesson 1 does not have enough unique active targets.');
        }

        $this->recordExposures($learnerId, $scope, $cycle, [...$missionOne, ...$contextSelection]);

        return [
            'mission-1' => $missionOne,
            'mission-2' => array_slice($contextSelection, 0, 5),
            'mission-3' => array_slice($contextSelection, 5, 5),
        ];
    }

    /** @return array<string, list<array<string, string>>> */
    public function lessonTwoSnapshot(int $learnerId): array
    {
        $rows = $this->readWords();
        $scope = 'required.lesson-2.word-targets';
        [$cycle, $used] = $this->exposureState($learnerId, $scope);
        $available = array_values(array_filter(
            $rows,
            fn (array $row): bool => ! in_array($row['target_key'], $used, true),
        ));
        $eligible = $this->lessonTwoEligible($available);

        if (count($eligible) < 10) {
            $cycle++;
            $eligible = $this->lessonTwoEligible($rows);
        }

        shuffle($eligible);
        $selection = array_slice($eligible, 0, 10);
        if (count($selection) < 10) {
            throw new RuntimeException('Lesson 2 does not have enough unique active targets.');
        }

        $this->recordExposures($learnerId, $scope, $cycle, $selection);

        return [
            'mission-1' => array_slice($selection, 0, 5),
            'mission-2' => array_slice($selection, 5, 5),
        ];
    }

    /** @return array<string, list<array<string, string>>> */
    public function lessonThreeSnapshot(int $learnerId): array
    {
        return $this->singleMissionSnapshot(
            $learnerId,
            $this->readPhrases(),
            'required.lesson-3.phrase-targets',
            'Lesson 3',
        );
    }

    /** @return array<string, list<array<string, string>>> */
    public function lessonFourSnapshot(int $learnerId): array
    {
        return $this->singleMissionSnapshot(
            $learnerId,
            $this->readSentences(),
            'required.lesson-4.sentence-targets',
            'Lesson 4',
        );
    }

    /** @return array<string, list<array<string, string>>> */
    public function lessonFiveSnapshot(int $learnerId): array
    {
        return $this->singleMissionSnapshot(
            $learnerId,
            $this->readPassages(),
            'required.lesson-5.passage-targets',
            'Lesson 5',
            1,
        );
    }

    /** @return array<string, list<array<string, string>>> */
    public function lessonSixSnapshot(int $learnerId): array
    {
        $rows = $this->readComprehension();
        $scope = 'required.lesson-6.comprehension-targets';
        [$cycle, $used] = $this->exposureState($learnerId, $scope);
        $questionTypes = ['who', 'what', 'where', 'when', 'why'];

        $select = function (array $pool) use ($questionTypes): array {
            $selection = [];
            foreach ($questionTypes as $questionType) {
                $candidates = array_values(array_filter(
                    $pool,
                    fn (array $row): bool => $row['question_type'] === $questionType,
                ));
                shuffle($candidates);
                if ($candidates === []) {
                    return [];
                }
                $selection[] = $candidates[0];
            }

            return $selection;
        };

        $available = array_values(array_filter(
            $rows,
            fn (array $row): bool => ! in_array($row['target_key'], $used, true),
        ));
        $selection = $select($available);

        if (count($selection) !== 5) {
            $cycle++;
            $selection = $select($rows);
        }

        if (count($selection) !== 5) {
            throw new RuntimeException(
                'Lesson 6 requires one active item for every 5W question family.',
            );
        }

        $this->recordExposures($learnerId, $scope, $cycle, $selection);

        return ['mission-1' => $selection];
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array<string, list<array<string, string>>>
     */
    private function singleMissionSnapshot(
        int $learnerId,
        array $rows,
        string $scope,
        string $label,
        int $selectionCount = 5,
    ): array {
        [$cycle, $used] = $this->exposureState($learnerId, $scope);
        $available = array_values(array_filter(
            $rows,
            fn (array $row): bool => ! in_array($row['target_key'], $used, true),
        ));

        if (count($available) < $selectionCount) {
            $cycle++;
            $available = $rows;
        }

        shuffle($available);
        $selection = array_slice($available, 0, $selectionCount);
        if (count($selection) < $selectionCount) {
            throw new RuntimeException("{$label} does not have enough unique active targets.");
        }

        $this->recordExposures($learnerId, $scope, $cycle, $selection);

        return ['mission-1' => $selection];
    }

    /** @return list<array<string, string>> */
    private function readLetters(): array
    {
        return $this->readActiveRows(
            '../../content/lessons/v1/lesson-1-letter-items.csv',
            'Lesson 1',
        );
    }

    /** @return list<array<string, string>> */
    private function readWords(): array
    {
        return $this->readActiveRows(
            '../../content/lessons/v1/lesson-2-word-items.csv',
            'Lesson 2',
        );
    }

    /** @return list<array<string, string>> */
    private function readPhrases(): array
    {
        return $this->readActiveRows(
            '../../content/lessons/v1/lesson-3-phrases.csv',
            'Lesson 3',
        );
    }

    /** @return list<array<string, string>> */
    private function readSentences(): array
    {
        return $this->readActiveRows(
            '../../content/lessons/v1/lesson-4-sentences.csv',
            'Lesson 4',
        );
    }

    /** @return list<array<string, string>> */
    private function readPassages(): array
    {
        return $this->readActiveRows(
            '../../content/lessons/v1/lesson-5-passages.csv',
            'Lesson 5',
        );
    }

    /** @return list<array<string, string>> */
    private function readComprehension(): array
    {
        return $this->readActiveRows(
            '../../content/lessons/v1/lesson-6-comprehension.csv',
            'Lesson 6',
        );
    }

    /**
     * @return array{int, list<string>}
     */
    private function exposureState(int $learnerId, string $scope): array
    {
        $cycle = (int) (DB::table('lesson_target_exposures')
            ->where('learner_id', $learnerId)
            ->where('scope_key', $scope)
            ->where('content_version', 'v1')
            ->max('cycle') ?? 1);
        $used = DB::table('lesson_target_exposures')
            ->where('learner_id', $learnerId)
            ->where('scope_key', $scope)
            ->where('content_version', 'v1')
            ->where('cycle', $cycle)
            ->pluck('target_key')
            ->all();

        return [$cycle, $used];
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return list<array<string, string>>
     */
    private function lessonTwoEligible(array $rows): array
    {
        return array_values(array_filter(
            $rows,
            fn (array $row): bool => $row['eligible_mission_1'] === 'true'
                && $row['eligible_mission_2'] === 'true',
        ));
    }

    /** @param list<array<string, string>> $rows */
    private function recordExposures(
        int $learnerId,
        string $scope,
        int $cycle,
        array $rows,
    ): void {
        foreach ($rows as $row) {
            DB::table('lesson_target_exposures')->insertOrIgnore([
                'learner_id' => $learnerId,
                'scope_key' => $scope,
                'content_version' => 'v1',
                'cycle' => $cycle,
                'target_key' => $row['target_key'],
                'encountered_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /** @return list<array<string, string>> */
    private function readActiveRows(string $relativePath, string $label): array
    {
        $path = base_path($relativePath);
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException("{$label} content is unavailable.");
        }

        try {
            $headers = fgetcsv($stream);
            if (! is_array($headers)) {
                throw new RuntimeException("{$label} content has no header.");
            }
            $rows = [];
            while (($values = fgetcsv($stream)) !== false) {
                if (count($values) !== count($headers)) {
                    throw new RuntimeException("{$label} content is malformed.");
                }
                $row = array_combine($headers, $values);
                if ($row !== false && $row['status'] === 'active') {
                    $rows[] = $row;
                }
            }

            return $rows;
        } finally {
            fclose($stream);
        }
    }
}
