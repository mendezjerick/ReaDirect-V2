<?php

namespace App\Services;

use RuntimeException;

final class FilipinoTtsCatalogSource
{
    private const EXPECTED_LINE_COUNT = 300;

    private const LINE_HEADERS = [
        'speech_key',
        'area',
        'reference_role',
        'audio_path',
        'english_text',
        'filipino_text',
        'translation_policy',
        'review_status',
        'review_notes',
    ];

    private const REFERENCE_HEADERS = [
        'reference_role',
        'reference_path',
        'review_status',
        'review_notes',
    ];

    private const REVIEW_STATUSES = [
        'draft',
        'academic_review_required',
        'approved',
        'rejected',
    ];

    private const TRANSLATION_POLICIES = [
        'translate',
        'code_switch_target',
        'preserve_english',
        'academic_review',
    ];

    private const REFERENCE_REVIEW_STATUSES = [
        'missing',
        'candidate',
        'approved',
        'rejected',
    ];

    public function __construct(
        private readonly PublishedTtsCatalogDefinitions $publishedDefinitions,
        private readonly ?string $lineSourceOverride = null,
        private readonly ?string $referenceSourceOverride = null,
    ) {}

    /**
     * @return array<string, array{
     *     speech_key: string,
     *     area: string,
     *     reference_role: string,
     *     audio_path: string,
     *     english_text: string,
     *     filipino_text: string,
     *     translation_policy: string,
     *     review_status: string,
     *     review_notes: string
     * }>
     */
    public function lines(): array
    {
        $rows = $this->readCsv($this->lineSourcePath(), self::LINE_HEADERS);
        $english = $this->publishedDefinitions->english();
        $lines = [];

        foreach ($rows as $row) {
            $speechKey = $row['speech_key'];
            if ($speechKey === '' || isset($lines[$speechKey])) {
                throw new RuntimeException(
                    "Filipino TTS source contains an empty or duplicate key: {$speechKey}",
                );
            }
            if (! isset($english[$speechKey])) {
                throw new RuntimeException("Unknown Filipino TTS speech key: {$speechKey}");
            }
            if ($row['english_text'] !== $english[$speechKey]['text']
                || $row['reference_role'] !== $english[$speechKey]['reference']
                || $row['audio_path'] !== $english[$speechKey]['path']) {
                throw new RuntimeException(
                    "Filipino TTS source diverges from the English contract: {$speechKey}",
                );
            }
            if ($row['filipino_text'] === '' || str_contains($row['filipino_text'], '!')) {
                throw new RuntimeException("Invalid Filipino TTS text: {$speechKey}");
            }
            if (! in_array($row['review_status'], self::REVIEW_STATUSES, true)) {
                throw new RuntimeException("Invalid Filipino review status: {$speechKey}");
            }
            if (! in_array(
                $row['translation_policy'],
                self::TRANSLATION_POLICIES,
                true,
            )) {
                throw new RuntimeException("Invalid Filipino translation policy: {$speechKey}");
            }
            if (! $this->isSafeRelativeWavPath($row['audio_path'])) {
                throw new RuntimeException("Invalid Filipino TTS audio path: {$speechKey}");
            }

            $lines[$speechKey] = $row;
        }

        if (count($lines) !== self::EXPECTED_LINE_COUNT
            || array_diff_key($lines, $english) !== []) {
            throw new RuntimeException(sprintf(
                'Expected %d Filipino TTS lines matching English, resolved %d.',
                self::EXPECTED_LINE_COUNT,
                count($lines),
            ));
        }

        return $lines;
    }

    /**
     * @return array<string, array{
     *     reference_role: string,
     *     reference_path: string,
     *     review_status: string,
     *     review_notes: string
     * }>
     */
    public function referenceProfiles(): array
    {
        $rows = $this->readCsv(
            $this->referenceSourcePath(),
            self::REFERENCE_HEADERS,
        );
        $expectedRoles = (array) config('speech.tts_reference_profiles');
        $profiles = [];

        foreach ($rows as $row) {
            $role = $row['reference_role'];
            if (! in_array($role, $expectedRoles, true) || isset($profiles[$role])) {
                throw new RuntimeException("Invalid Filipino reference role: {$role}");
            }
            if (! in_array(
                $row['review_status'],
                self::REFERENCE_REVIEW_STATUSES,
                true,
            )) {
                throw new RuntimeException("Invalid Filipino reference review status: {$role}");
            }
            if (in_array($row['review_status'], ['candidate', 'approved'], true)) {
                if ($row['reference_path'] === ''
                    || ! $this->repositoryPath($row['reference_path'])->isFile()) {
                    throw new RuntimeException("Filipino reference audio is missing: {$role}");
                }
            } elseif ($row['reference_path'] !== '') {
                throw new RuntimeException(
                    "Unavailable Filipino reference role has an unexpected path: {$role}",
                );
            }

            $profiles[$role] = $row;
        }

        if (array_diff($expectedRoles, array_keys($profiles)) !== []) {
            throw new RuntimeException('Filipino reference manifest is incomplete.');
        }

        return $profiles;
    }

    /**
     * @return array{
     *     publication_ready: bool,
     *     total_lines: int,
     *     line_review_counts: array<string, int>,
     *     reference_review: array<string, string>,
     *     candidate_generation_lines: int,
     *     blockers: list<string>
     * }
     */
    public function audit(): array
    {
        $lines = $this->lines();
        $profiles = $this->referenceProfiles();
        $lineReviewCounts = array_fill_keys(self::REVIEW_STATUSES, 0);
        foreach ($lines as $line) {
            $lineReviewCounts[$line['review_status']]++;
        }
        $referenceReview = [];
        foreach ($profiles as $role => $profile) {
            $referenceReview[$role] = $profile['review_status'];
        }

        $candidateRoles = array_keys(array_filter(
            $profiles,
            fn (array $profile): bool => in_array(
                $profile['review_status'],
                ['candidate', 'approved'],
                true,
            ),
        ));
        $candidateGenerationLines = count(array_filter(
            $lines,
            fn (array $line): bool => in_array(
                $line['review_status'],
                ['draft', 'approved'],
                true,
            ) && in_array($line['reference_role'], $candidateRoles, true),
        ));
        $blockers = [];
        foreach ($lineReviewCounts as $status => $count) {
            if ($status !== 'approved' && $count > 0) {
                $blockers[] = "{$count} fixed lines are {$status}.";
            }
        }
        foreach ($referenceReview as $role => $status) {
            if ($status !== 'approved') {
                $blockers[] = "The {$role} reference is {$status}.";
            }
        }

        return [
            'publication_ready' => $blockers === [],
            'total_lines' => count($lines),
            'line_review_counts' => $lineReviewCounts,
            'reference_review' => $referenceReview,
            'candidate_generation_lines' => $candidateGenerationLines,
            'blockers' => $blockers,
        ];
    }

    /** @return array<string, array{text: string, reference: string, path: string}> */
    public function publicationDefinitions(): array
    {
        $audit = $this->audit();
        if (! $audit['publication_ready']) {
            throw new RuntimeException(
                'Filipino TTS publication is blocked: '.implode(' ', $audit['blockers']),
            );
        }

        return $this->definitionsFromLines($this->lines());
    }

    /**
     * @param  list<string>  $roles
     * @return array<string, array{text: string, reference: string, path: string}>
     */
    public function candidateDefinitions(
        array $roles,
        bool $includeDrafts,
        bool $allowCandidateReferences,
    ): array {
        $profiles = $this->referenceProfiles();
        foreach ($roles as $role) {
            $profile = $profiles[$role] ?? null;
            $allowedStatuses = $allowCandidateReferences
                ? ['candidate', 'approved']
                : ['approved'];
            if (! is_array($profile)
                || ! in_array($profile['review_status'], $allowedStatuses, true)) {
                throw new RuntimeException(
                    "Filipino reference role {$role} is not approved for candidate generation.",
                );
            }
        }

        $allowedLineStatuses = $includeDrafts ? ['draft', 'approved'] : ['approved'];
        $lines = array_filter(
            $this->lines(),
            fn (array $line): bool => in_array($line['reference_role'], $roles, true)
                && in_array($line['review_status'], $allowedLineStatuses, true),
        );

        return $this->definitionsFromLines($lines);
    }

    /**
     * @param  array<string, array<string, string>>  $lines
     * @return array<string, array{text: string, reference: string, path: string}>
     */
    private function definitionsFromLines(array $lines): array
    {
        return array_map(
            fn (array $line): array => [
                'text' => $line['filipino_text'],
                'reference' => $line['reference_role'],
                'path' => $line['audio_path'],
            ],
            $lines,
        );
    }

    /** @param list<string> $expectedHeaders
     * @return list<array<string, string>>
     */
    private function readCsv(string $path, array $expectedHeaders): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException("Cannot open Filipino TTS source: {$path}");
        }

        try {
            $headers = fgetcsv($handle);
            if ($headers !== $expectedHeaders) {
                throw new RuntimeException("Invalid Filipino TTS CSV headers: {$path}");
            }
            $rows = [];
            while (($values = fgetcsv($handle)) !== false) {
                if (count($values) !== count($headers)) {
                    throw new RuntimeException("Invalid Filipino TTS CSV row: {$path}");
                }
                $row = array_combine($headers, $values);
                if (! is_array($row)) {
                    throw new RuntimeException("Invalid Filipino TTS CSV row: {$path}");
                }
                $rows[] = $row;
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }

    private function isSafeRelativeWavPath(string $path): bool
    {
        return $path !== ''
            && str_ends_with(strtolower($path), '.wav')
            && ! str_starts_with($path, '/')
            && ! str_starts_with($path, '\\')
            && ! str_contains($path, '..')
            && ! str_contains($path, '\\');
    }

    private function lineSourcePath(): string
    {
        if ($this->lineSourceOverride !== null) {
            return $this->lineSourceOverride;
        }

        return $this->repositoryPath(
            'content/tts/v1/fil-PH/published-lines.csv',
        )->getPathname();
    }

    private function referenceSourcePath(): string
    {
        if ($this->referenceSourceOverride !== null) {
            return $this->referenceSourceOverride;
        }

        return $this->repositoryPath(
            'content/tts/v1/fil-PH/reference-profiles.csv',
        )->getPathname();
    }

    private function repositoryPath(string $relativePath): \SplFileInfo
    {
        return new \SplFileInfo(dirname(base_path(), 2).'/'.$relativePath);
    }
}
