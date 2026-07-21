<?php

namespace App\Http\Controllers;

use App\Models\EquivalenceRule;
use App\Models\SpeechSandboxAttempt;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use App\Services\SpeechConfusionMatrix;
use App\Services\SpeechContentCatalog;
use App\Services\SpeechEquivalenceResolver;
use App\Services\SpeechProcessingSettings;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class SystemAdminSpeechSandboxController extends Controller
{
    public function contentCatalog(StaffUser $staffUser, SpeechContentCatalog $catalog): JsonResponse
    {
        $this->assertSystemAdministrator($staffUser);

        return response()->json($catalog->forTrueSandbox());
    }

    public function status(StaffUser $staffUser): JsonResponse
    {
        $this->assertSystemAdministrator($staffUser);

        try {
            $response = $this->client()->get($this->asrUrl('/models/status'));
            $payload = $response->json() ?? [];
            $mu = $payload['mu'] ?? [
                'available' => false,
                'model' => 'mu',
            ];

            return response()->json([
                'nu' => [
                    ...$mu,
                    'model' => 'nu',
                    'task' => 'isolated_letter_resolution',
                    'engine' => 'mu',
                    'resolver' => 'strict_letter_alias_v2',
                ],
                'mu' => $mu,
            ], $response->status());
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'The ASR service is not running.',
                'nu' => ['available' => false, 'model' => 'nu'],
                'mu' => ['available' => false, 'model' => 'mu'],
            ], 503);
        }
    }

    public function resolveLetter(Request $request, StaffUser $staffUser): JsonResponse
    {
        $this->assertSystemAdministrator($staffUser);
        $validated = $request->validate([
            'audio' => ['required', 'file', 'max:25600'],
            'expected_letter' => ['required', 'string', 'size:1', 'regex:/^[A-Za-z]$/'],
            'fixture_set' => [
                'nullable',
                'required_with:fixture_audit_version',
                Rule::in(['millie2', 'jz', 'shai']),
            ],
            'fixture_audit_version' => [
                'nullable',
                'required_with:fixture_set',
                Rule::in([SpeechConfusionMatrix::LETTER_AUDIT_VERSION]),
            ],
            'distractor_audit_version' => [
                'nullable',
                Rule::in([SpeechConfusionMatrix::LETTER_NEGATIVE_AUDIT_VERSION]),
            ],
            'ground_truth' => [
                'nullable',
                'required_with:distractor_audit_version',
                Rule::in(['negative']),
            ],
            'distractor_type' => [
                'nullable',
                'required_with:distractor_audit_version',
                Rule::in(['fptn', 'silence']),
            ],
            'assigned_letter' => [
                'nullable',
                'required_with:distractor_audit_version',
                'string',
                'size:1',
                'regex:/^[A-Za-z]$/',
            ],
        ]);

        if (isset($validated['fixture_audit_version'])
            && isset($validated['distractor_audit_version'])) {
            throw ValidationException::withMessages([
                'distractor_audit_version' => 'A letter attempt cannot be both positive fixture evidence and negative distractor evidence.',
            ]);
        }

        if (isset($validated['assigned_letter'])
            && strtoupper($validated['assigned_letter']) !== strtoupper($validated['expected_letter'])) {
            throw ValidationException::withMessages([
                'assigned_letter' => 'The assigned distractor letter must match the expected letter.',
            ]);
        }

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
            ])
            ->values()
            ->all();

        return $this->forwardAudio(
            staffUser: $staffUser,
            audio: $validated['audio'],
            endpoint: '/mu/resolve-letter',
            fields: [
                'expected_letter' => strtoupper($validated['expected_letter']),
                'equivalences' => json_encode($equivalences, JSON_THROW_ON_ERROR),
            ],
            mode: SpeechSandboxAttempt::MODE_LETTER,
            expectedValue: strtoupper($validated['expected_letter']),
            actionKey: 'speech_sandbox.letter_attempted',
            description: 'Ran an isolated-letter sample through Nu using Mu.',
            requestMetadata: [
                'fixture_set' => $validated['fixture_set'] ?? null,
                'fixture_audit_version' => $validated['fixture_audit_version'] ?? null,
                'distractor_audit_version' => $validated['distractor_audit_version'] ?? null,
                'ground_truth' => $validated['ground_truth'] ?? null,
                'distractor_type' => $validated['distractor_type'] ?? null,
                'assigned_letter' => isset($validated['assigned_letter'])
                    ? strtoupper($validated['assigned_letter'])
                    : null,
                'task_type' => isset($validated['fixture_audit_version'])
                    || isset($validated['distractor_audit_version'])
                        ? 'letter'
                        : null,
            ],
        );
    }

    public function transcribeMu(
        Request $request,
        StaffUser $staffUser,
        SpeechEquivalenceResolver $equivalenceResolver,
    ): JsonResponse {
        $this->assertSystemAdministrator($staffUser);
        $validated = $request->validate([
            'audio' => ['required', 'file', 'max:25600'],
            'expected_text' => ['required', 'string', 'max:4000'],
            'task_type' => [
                'required',
                Rule::in(['word', 'phrase', 'sentence', 'passage', 'comprehension', 'free_speech']),
            ],
            'item_key' => ['nullable', 'string', 'max:160'],
            'fixture_set' => [
                'nullable',
                Rule::in(['millie2', 'millie2-plus', 'jz', 'shai']),
            ],
            'fixture_audit_version' => ['nullable', 'string', 'max:80'],
            'distractor_audit_version' => [
                'nullable',
                Rule::in([SpeechConfusionMatrix::NEGATIVE_AUDIT_VERSION]),
            ],
            'ground_truth' => [
                'nullable',
                'required_with:distractor_audit_version',
                Rule::in(['negative']),
            ],
            'distractor_type' => [
                'nullable',
                'required_with:distractor_audit_version',
                Rule::in(['fptn', 'silence']),
            ],
            'assigned_content_id' => [
                'nullable',
                'required_with:distractor_audit_version',
                'string',
                'max:160',
            ],
        ]);

        $isDistractorAudit = isset($validated['distractor_audit_version']);

        return $this->forwardAudio(
            staffUser: $staffUser,
            audio: $validated['audio'],
            endpoint: '/mu/transcribe',
            fields: [
                'expected_text' => $validated['expected_text'],
                'task_type' => $validated['task_type'],
                'noise_reduction_enabled' => $isDistractorAudit
                    ? 'false'
                    : (app(SpeechProcessingSettings::class)
                        ->conditionalMuNoiseReductionEnabled() ? 'true' : 'false'),
            ],
            mode: SpeechSandboxAttempt::MODE_GENERAL,
            expectedValue: $validated['expected_text'],
            actionKey: 'speech_sandbox.mu_attempted',
            description: 'Ran a reading sample through Mu.',
            requestMetadata: [
                'item_key' => $validated['item_key'] ?? null,
                'fixture_set' => $validated['fixture_set'] ?? null,
                'fixture_audit_version' => $validated['fixture_audit_version'] ?? null,
                'distractor_audit_version' => $validated['distractor_audit_version'] ?? null,
                'ground_truth' => $validated['ground_truth'] ?? null,
                'distractor_type' => $validated['distractor_type'] ?? null,
                'assigned_content_id' => $validated['assigned_content_id'] ?? null,
            ],
            transformPayload: function (array $payload) use ($equivalenceResolver, $validated): array {
                if (! array_key_exists('raw_transcript', $payload)) {
                    return $payload;
                }

                return [
                    ...$payload,
                    'equivalence_resolution' => $equivalenceResolver->resolve(
                        $validated['expected_text'],
                        (string) $payload['raw_transcript'],
                        $validated['item_key'] ?? null,
                    ),
                ];
            },
        );
    }

    public function reviewAttempt(
        Request $request,
        StaffUser $staffUser,
        SpeechSandboxAttempt $speechSandboxAttempt,
    ): JsonResponse {
        $this->assertSystemAdministrator($staffUser);
        if ($speechSandboxAttempt->staff_user_id !== $staffUser->id) {
            abort(404);
        }

        $validated = $request->validate([
            'review_outcome' => ['required', Rule::in(['expected_correct', 'expected_wrong'])],
        ]);
        $speechSandboxAttempt->update([
            'review_outcome' => $validated['review_outcome'],
        ]);

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => 'speech_sandbox.attempt_reviewed',
            'description' => 'Reviewed a recorded Mu speech attempt.',
            'metadata' => [
                'sandbox_attempt_id' => $speechSandboxAttempt->id,
                'review_outcome' => $validated['review_outcome'],
            ],
        ]);

        return response()->json([
            'attempt' => [
                'id' => $speechSandboxAttempt->id,
                'review_outcome' => $speechSandboxAttempt->review_outcome,
            ],
        ]);
    }

    public function storeEquivalenceRule(Request $request, StaffUser $staffUser): JsonResponse
    {
        $this->assertSystemAdministrator($staffUser);
        $validated = $request->validate([
            'review_outcome' => ['required', Rule::in(['expected_correct'])],
            'rule_type' => [
                'required',
                Rule::in([
                    'homophone',
                    'punctuation',
                    'contraction',
                    'spelling_variant',
                    'accepted_variant',
                    'accent_safe_variant',
                    'letter_alias',
                    'token_alias',
                ]),
            ],
            'expected_text' => ['required', 'string', 'max:4000'],
            'recognized_text' => ['required', 'string', 'max:4000'],
            'scope' => ['required', Rule::in(['global', 'item'])],
            'item_key' => ['nullable', 'required_if:scope,item', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'sandbox_attempt_id' => ['nullable', 'integer', Rule::exists('speech_sandbox_attempts', 'id')],
        ]);

        if ($validated['rule_type'] === 'letter_alias') {
            $validated = $this->prepareLetterAlias($validated, $staffUser);
        } elseif ($validated['rule_type'] === 'token_alias') {
            $validated = $this->prepareTokenAlias($validated);
        }

        $rule = EquivalenceRule::query()->firstOrCreate([
            'rule_type' => $validated['rule_type'],
            'expected_text' => $validated['expected_text'],
            'recognized_text' => $validated['recognized_text'],
            'scope' => $validated['scope'],
            'item_key' => $validated['scope'] === 'item' ? $validated['item_key'] : null,
        ], [
            'notes' => $validated['notes'] ?? null,
            'is_active' => true,
            'created_by_staff_user_id' => $staffUser->id,
        ]);

        if (isset($validated['sandbox_attempt_id'])) {
            SpeechSandboxAttempt::query()
                ->whereKey($validated['sandbox_attempt_id'])
                ->where('staff_user_id', $staffUser->id)
                ->update([
                    'review_outcome' => 'expected_correct',
                    'equivalence_rule_id' => $rule->id,
                ]);
        }

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => 'equivalence_rule.created',
            'description' => "Created a {$rule->rule_type} Equivalence Book rule.",
            'metadata' => ['equivalence_rule_id' => $rule->id, 'scope' => $rule->scope],
        ]);

        return response()->json([
            'rule' => $rule,
            'created' => $rule->wasRecentlyCreated,
        ], 201);
    }

    private function forwardAudio(
        StaffUser $staffUser,
        UploadedFile $audio,
        string $endpoint,
        array $fields,
        string $mode,
        string $expectedValue,
        string $actionKey,
        string $description,
        array $requestMetadata = [],
        ?callable $transformPayload = null,
    ): JsonResponse {
        $audioEvidence = $this->storePrivateAudio($audio, $mode);
        $storedRequestMetadata = [...$fields, ...$requestMetadata];
        unset($storedRequestMetadata['equivalences']);

        try {
            $response = $this->client()
                ->attach(
                    'audio',
                    $audioEvidence['contents'],
                    $audio->getClientOriginalName(),
                )
                ->post($this->asrUrl($endpoint), $fields);
            $servicePayload = $response->json() ?? [
                'message' => 'The ASR service returned an invalid response.',
            ];
            if ($transformPayload !== null) {
                $servicePayload = $transformPayload($servicePayload);
            }
            $attempt = SpeechSandboxAttempt::query()->create([
                'staff_user_id' => $staffUser->id,
                'mode' => $mode,
                'expected_value' => $expectedValue,
                'audio_path' => $audioEvidence['relative_path'],
                'audio_original_name' => $audio->getClientOriginalName(),
                'audio_mime_type' => $audio->getClientMimeType(),
                'audio_size_bytes' => strlen($audioEvidence['contents']),
                'audio_sha256' => hash('sha256', $audioEvidence['contents']),
                'service_status' => $response->status(),
                'request_metadata' => $storedRequestMetadata,
                'service_response' => $servicePayload,
            ]);
        } catch (ConnectionException $error) {
            $attempt = SpeechSandboxAttempt::query()->create([
                'staff_user_id' => $staffUser->id,
                'mode' => $mode,
                'expected_value' => $expectedValue,
                'audio_path' => $audioEvidence['relative_path'],
                'audio_original_name' => $audio->getClientOriginalName(),
                'audio_mime_type' => $audio->getClientMimeType(),
                'audio_size_bytes' => strlen($audioEvidence['contents']),
                'audio_sha256' => hash('sha256', $audioEvidence['contents']),
                'request_metadata' => $storedRequestMetadata,
                'error_message' => $error->getMessage(),
            ]);

            return response()->json([
                'message' => 'The ASR service is not running.',
                'sandbox_attempt_id' => $attempt->id,
            ], 503);
        }

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => $actionKey,
            'description' => $description,
            'metadata' => [
                'service_status' => $response->status(),
                'input' => $storedRequestMetadata,
                'sandbox_attempt_id' => $attempt->id,
                'result' => [
                    'decision' => $servicePayload['decision'] ?? null,
                    'predicted_class' => $servicePayload['predicted_class'] ?? null,
                    'raw_transcript' => $servicePayload['raw_transcript'] ?? null,
                ],
            ],
        ]);

        return response()->json([
            ...$servicePayload,
            'sandbox_attempt_id' => $attempt->id,
        ], $response->status());
    }

    /** @param array<string, mixed> $validated */
    private function prepareTokenAlias(array $validated): array
    {
        if (($validated['scope'] ?? null) !== 'item') {
            throw ValidationException::withMessages([
                'scope' => 'A token alias must be scoped to one authored item.',
            ]);
        }

        $expected = $this->normalizeToken($validated['expected_text']);
        $recognized = $this->normalizeToken($validated['recognized_text']);
        if ($expected === null || $recognized === null || $expected === $recognized) {
            throw ValidationException::withMessages([
                'recognized_text' => 'A token alias requires two different single-word values.',
            ]);
        }

        $validated['expected_text'] = $expected;
        $validated['recognized_text'] = $recognized;

        return $validated;
    }

    private function normalizeToken(string $value): ?string
    {
        preg_match_all("/[a-z0-9']+/", mb_strtolower($value), $matches);

        return count($matches[0]) === 1 ? $matches[0][0] : null;
    }

    /** @return array{contents: string, relative_path: string} */
    private function storePrivateAudio(UploadedFile $audio, string $mode): array
    {
        $contents = file_get_contents($audio->getRealPath());
        if ($contents === false) {
            throw ValidationException::withMessages(['audio' => 'The uploaded audio could not be read.']);
        }

        $extension = strtolower($audio->getClientOriginalExtension());
        if (! in_array($extension, ['wav', 'mp3', 'm4a', 'webm', 'ogg', 'flac'], true)) {
            $extension = 'bin';
        }
        $relativePath = sprintf(
            'speech-sandbox/%s/%s/%s.%s',
            $mode,
            now()->format('Y/m/d'),
            Str::uuid(),
            $extension,
        );
        $evidenceRoot = app()->environment('testing')
            ? storage_path('framework/testing/private')
            : storage_path('app/private');
        $absolutePath = $evidenceRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
        $directory = dirname($absolutePath);
        if (! is_dir($directory) && ! @mkdir($directory, 0755, true) && ! is_dir($directory)) {
            throw new \RuntimeException('The private speech evidence directory could not be created.');
        }
        if (file_put_contents($absolutePath, $contents) === false) {
            throw new \RuntimeException('The private speech evidence file could not be written.');
        }

        return ['contents' => $contents, 'relative_path' => $relativePath];
    }

    /** @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    private function prepareLetterAlias(array $validated, StaffUser $staffUser): array
    {
        $expected = strtoupper(trim((string) $validated['expected_text']));
        if (! preg_match('/^[A-Z]$/', $expected)) {
            throw ValidationException::withMessages([
                'expected_text' => 'A letter alias must resolve to exactly one A-Z letter.',
            ]);
        }

        $recognized = $this->normalizeLetterAlias((string) $validated['recognized_text']);
        if ($recognized === '') {
            throw ValidationException::withMessages([
                'recognized_text' => 'A letter alias requires a spoken Mu transcript.',
            ]);
        }
        if (preg_match('/^[a-z]$/', $recognized) && strtoupper($recognized) !== $expected) {
            throw ValidationException::withMessages([
                'recognized_text' => 'A literal letter cannot be reassigned to a different letter.',
            ]);
        }

        $conflict = EquivalenceRule::query()
            ->where('rule_type', 'letter_alias')
            ->where('scope', 'global')
            ->where('recognized_text', $recognized)
            ->where('expected_text', '!=', $expected)
            ->where('is_active', true)
            ->exists();
        if ($conflict) {
            throw ValidationException::withMessages([
                'recognized_text' => 'This spoken alias already belongs to another letter.',
            ]);
        }

        if (isset($validated['sandbox_attempt_id'])) {
            $attemptIsOwnedLetterRun = SpeechSandboxAttempt::query()
                ->whereKey($validated['sandbox_attempt_id'])
                ->where('staff_user_id', $staffUser->id)
                ->where('mode', SpeechSandboxAttempt::MODE_LETTER)
                ->exists();
            if (! $attemptIsOwnedLetterRun) {
                throw ValidationException::withMessages([
                    'sandbox_attempt_id' => 'The reviewed letter attempt is unavailable.',
                ]);
            }
        }

        return [
            ...$validated,
            'expected_text' => $expected,
            'recognized_text' => $recognized,
            'scope' => 'global',
            'item_key' => null,
        ];
    }

    private function normalizeLetterAlias(string $value): string
    {
        $ascii = Str::ascii(Str::lower($value));
        $tokens = preg_split('/[^a-z]+/', $ascii, -1, PREG_SPLIT_NO_EMPTY);

        return implode(' ', $tokens ?: []);
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->connectTimeout(config('speech.connect_timeout_seconds'))
            ->timeout(config('speech.request_timeout_seconds'));
    }

    private function asrUrl(string $path): string
    {
        return rtrim(config('speech.asr_url'), '/').$path;
    }

    private function assertSystemAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'system_admin' || ! $staffUser->is_active) {
            abort(404);
        }
    }
}
