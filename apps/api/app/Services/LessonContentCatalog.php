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
