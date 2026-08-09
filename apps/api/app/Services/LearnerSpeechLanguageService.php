<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Learner;
use App\Support\SpeechLanguage;
use DomainException;
use Illuminate\Support\Facades\DB;

final class LearnerSpeechLanguageService
{
    public function __construct(
        private readonly PublishedTtsVoiceResolver $publishedVoices,
    ) {}

    /**
     * @return array{
     *     speech_language: string,
     *     languages: list<array{code: string, label: string, available: bool, selected: bool}>
     * }
     */
    public function contract(Learner $learner): array
    {
        $selected = SpeechLanguage::normalize($learner->speech_language);
        $labels = SpeechLanguage::labels();
        $languages = [];

        foreach (SpeechLanguage::codes() as $code) {
            $languages[] = [
                'code' => $code,
                'label' => $labels[$code],
                'available' => $this->isAvailable($code),
                'selected' => $code === $selected,
            ];
        }

        return [
            'speech_language' => $selected,
            'languages' => $languages,
        ];
    }

    /**
     * @return array{
     *     speech_language: string,
     *     languages: list<array{code: string, label: string, available: bool, selected: bool}>
     * }
     */
    public function update(Learner $learner, string $language): array
    {
        $current = SpeechLanguage::normalize($learner->speech_language);

        if ($language !== $current && ! $this->isAvailable($language)) {
            throw new DomainException(
                "The {$this->languageLabel($language)} speech catalog is not available yet.",
            );
        }

        $learner = DB::transaction(function () use ($learner, $language): Learner {
            $locked = Learner::query()->lockForUpdate()->findOrFail($learner->id);
            if ($locked->speech_language !== $language) {
                $locked->forceFill(['speech_language' => $language])->save();
            }

            return $locked->fresh();
        });

        return $this->contract($learner);
    }

    private function languageLabel(string $language): string
    {
        return SpeechLanguage::labels()[$language] ?? $language;
    }

    private function isAvailable(string $language): bool
    {
        if (! $this->publishedVoices->existsForLanguage($language)) {
            return false;
        }

        $required = config('speech.tts_required_runtime_profiles', []);
        $available = config("speech.tts_reference_profiles_by_language.{$language}", []);
        if (! is_array($required) || ! is_array($available)) {
            return false;
        }

        return array_diff($required, $available) === [];
    }
}
