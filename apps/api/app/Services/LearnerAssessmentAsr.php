<?php

namespace App\Services;

use App\Models\EquivalenceRule;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class LearnerAssessmentAsr
{
    /** @return array<string, mixed> */
    public function orientation(UploadedFile $audio): array
    {
        return $this->send($audio, '/mu/transcribe', [
            'expected_text' => 'ready',
            'task_type' => 'word',
            'noise_reduction_enabled' => 'false',
        ]);
    }

    /** @return array<string, mixed> */
    public function letter(UploadedFile $audio, string $expectedLetter): array
    {
        $equivalences = EquivalenceRule::query()
            ->where('rule_type', 'letter_alias')
            ->where('scope', 'global')
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'expected_text', 'recognized_text'])
            ->map(fn (EquivalenceRule $rule): array => [
                'id' => $rule->id,
                'expected_letter' => strtoupper($rule->expected_text),
                'recognized_text' => $rule->recognized_text,
            ])->values()->all();

        return $this->send($audio, '/mu/resolve-letter', [
            'expected_letter' => strtoupper($expectedLetter),
            'equivalences' => json_encode($equivalences, JSON_THROW_ON_ERROR),
        ]);
    }

    /** @return array<string, mixed> */
    public function word(UploadedFile $audio, string $expectedWord): array
    {
        return $this->send($audio, '/mu/transcribe', [
            'expected_text' => $expectedWord,
            'task_type' => 'word',
            'noise_reduction_enabled' => app(SpeechProcessingSettings::class)
                ->conditionalMuNoiseReductionEnabled() ? 'true' : 'false',
        ]);
    }

    /** @param array<string, string> $fields
     * @return array<string, mixed>
     */
    private function send(UploadedFile $audio, string $endpoint, array $fields): array
    {
        try {
            $response = Http::acceptJson()
                ->connectTimeout((int) config('speech.connect_timeout_seconds'))
                ->timeout((int) config('speech.request_timeout_seconds'))
                ->attach('audio', file_get_contents($audio->getRealPath()), $audio->getClientOriginalName())
                ->post(rtrim((string) config('speech.asr_url'), '/').$endpoint, $fields);
        } catch (ConnectionException $error) {
            throw new RuntimeException('The reading checker is still getting ready.', previous: $error);
        }

        if (! $response->successful()) {
            throw new RuntimeException('The reading checker could not process that recording.');
        }

        return $response->json() ?? [];
    }
}
