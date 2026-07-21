import { z } from "zod";

const modelStatusSchema = z.object({
  available: z.boolean(),
  model: z.enum(["nu", "mu"]),
  task: z.string().optional(),
  checkpoint: z.string().optional(),
  device: z.string().optional(),
  compute_type: z.string().optional(),
  model_loaded: z.boolean().optional(),
  classes: z.array(z.string()).optional(),
  thresholds: z
    .record(z.string(), z.union([z.number(), z.string()]))
    .optional(),
});

const speechStatusSchema = z.object({
  nu: modelStatusSchema,
  mu: modelStatusSchema,
});

const speechContentItemSchema = z.object({
  content_id: z.string(),
  item_key: z.string(),
  display_text: z.string(),
  expected_text: z.string(),
  task_type: z.enum(["word", "phrase", "sentence", "passage", "comprehension"]),
});

const speechContentCatalogSchema = z.object({
  groups: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      source: z.enum(["assessment", "lesson"]),
      activity_key: z.string(),
      items: z.array(speechContentItemSchema),
    }),
  ),
  summary: z.object({
    total_items: z.number().int().nonnegative(),
    assessment_items: z.number().int().nonnegative(),
    lesson_items: z.number().int().nonnegative(),
  }),
});

const equivalenceRuleSchema = z.object({
  id: z.number().int().positive(),
  rule_type: z.string(),
  expected_text: z.string(),
  recognized_text: z.string(),
  scope: z.enum(["global", "item"]),
  item_key: z.string().nullable(),
  notes: z.string().nullable(),
  is_active: z.boolean(),
  created_by: z.string(),
  created_at: z.string().nullable(),
});

const equivalenceBookSchema = z.object({
  rules: z.array(equivalenceRuleSchema),
  summary: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    inactive: z.number().int().nonnegative(),
  }),
});

const confusionMatrixCellSchema = z.object({
  expected: z.string(),
  recognized: z.string(),
  count: z.number().int().nonnegative(),
  kind: z.enum(["match", "confusion"]),
});

const binarySourceSchema = z.object({
  attempts: z.number().int().nonnegative(),
  false_positives: z.number().int().nonnegative(),
  true_negatives: z.number().int().nonnegative(),
});

const binaryClassificationSchema = z.object({
  scope: z.enum(["overall", "content", "letter"]),
  evaluation_version: z.string(),
  acceptance_rule: z.string(),
  positive_attempts: z.number().int().nonnegative(),
  negative_attempts: z.number().int().nonnegative(),
  true_positives: z.number().int().nonnegative(),
  true_negatives: z.number().int().nonnegative(),
  false_positives: z.number().int().nonnegative(),
  false_negatives: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  specificity: z.number().min(0).max(1),
  f1_score: z.number().min(0).max(1),
  false_positive_rate: z.number().min(0).max(1),
  false_negative_rate: z.number().min(0).max(1),
  negative_sources: z.record(z.string(), binarySourceSchema),
});

const rawConfusionMatrixSchema = z.object({
  mode: z.literal("raw"),
  audit_version: z.string(),
  letter_audit_version: z.string(),
  selected_filters: z.object({
    fixture_set: z.string().nullable(),
    task_type: z.string().nullable(),
  }),
  available_filters: z.object({
    fixture_sets: z.array(z.string()),
    task_types: z.array(z.string()),
  }),
  summary: z.object({
    attempts: z.number().int().nonnegative(),
    exact_attempts: z.number().int().nonnegative(),
    mismatched_attempts: z.number().int().nonnegative(),
    expected_tokens: z.number().int().nonnegative(),
    matched_tokens: z.number().int().nonnegative(),
    substitutions: z.number().int().nonnegative(),
    omissions: z.number().int().nonnegative(),
    insertions: z.number().int().nonnegative(),
    raw_token_accuracy: z.number().min(0).max(1),
  }),
  binary_classification: binaryClassificationSchema,
  binary_classifications: z.object({
    overall: binaryClassificationSchema,
    content: binaryClassificationSchema,
    letter: binaryClassificationSchema,
  }),
  labels: z.object({
    expected: z.array(z.string()),
    recognized: z.array(z.string()),
  }),
  cells: z.array(confusionMatrixCellSchema),
  confusions: z.array(confusionMatrixCellSchema),
  generated_at: z.string(),
});

const audioQualitySchema = z.object({
  usable: z.boolean(),
  status: z.string(),
  duration_seconds: z.number(),
  sample_rate: z.number(),
  warnings: z.array(z.string()),
  noise_profile_reliable: z.boolean(),
  estimated_snr_db: z.number().nullable(),
  conditional_noise_reduction_recommended: z.boolean(),
  noise_profile_reason: z.string(),
});

const noiseProcessingSchema = z
  .object({
    algorithm: z.string(),
    maximum_attenuation_db: z.number(),
    enhanced_ratio: z.number(),
    original_ratio: z.number(),
  })
  .nullable();

const nuResultSchema = z.object({
  ok: z.literal(true),
  model: z.literal("nu"),
  engine: z.literal("mu"),
  resolver: z.string(),
  checkpoint: z.string(),
  expected_letter: z.string(),
  predicted_class: z.string(),
  decision: z.string(),
  raw_transcript: z.string(),
  normalized_transcript: z.string(),
  mapping: z.object({
    predicted_class: z.string(),
    candidate_letters: z.array(z.string()),
    matched_alias: z.string().nullable(),
    mapping_source: z.string(),
    equivalence_rule_ids: z.array(z.number().int()),
  }),
  language: z.string(),
  segments: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      text: z.string(),
      avg_logprob: z.number().nullable(),
      no_speech_prob: z.number().nullable(),
    }),
  ),
  audio_quality: audioQualitySchema,
  performance: z.object({
    preprocessing_seconds: z.number(),
    inference_seconds: z.number(),
    total_request_seconds: z.number(),
    real_time_factor: z.number().nullable(),
  }),
  device: z.string(),
  compute_type: z.string(),
  sandbox_attempt_id: z.number().int(),
});

const differenceSchema = z.object({
  status: z.enum(["match", "insertion", "omission", "substitution"]),
  expected: z.string(),
  recognized: z.string(),
});

const resolvedDifferenceSchema = z.object({
  status: z.enum([
    "match",
    "equivalent",
    "insertion",
    "omission",
    "substitution",
  ]),
  expected: z.string(),
  recognized: z.string(),
  equivalence_rule_id: z.number().int().optional(),
});

const muResultSchema = z.object({
  ok: z.literal(true),
  model: z.literal("mu"),
  checkpoint: z.string(),
  runtime: z.string(),
  raw_transcript: z.string(),
  basic_normalized_transcript: z.string(),
  expected_text: z.string(),
  expected_normalized_text: z.string(),
  comparison: z.object({
    exact_match: z.boolean(),
    expected_word_count: z.number().int().nonnegative(),
    recognized_word_count: z.number().int().nonnegative(),
    matched_word_count: z.number().int().nonnegative(),
    differences: z.array(differenceSchema),
  }),
  equivalence_resolution: z
    .object({
      raw_exact_match: z.boolean(),
      accepted_match: z.boolean(),
      resolution_source: z.enum([
        "exact",
        "full_equivalence",
        "token_equivalence",
        "none",
      ]),
      expected_word_count: z.number().int().nonnegative(),
      recognized_word_count: z.number().int().nonnegative(),
      matched_word_count: z.number().int().nonnegative(),
      equivalent_word_count: z.number().int().nonnegative(),
      differences: z.array(resolvedDifferenceSchema),
      equivalence_rule_ids: z.array(z.number().int()),
    })
    .optional(),
  language: z.string(),
  task_type: z.string(),
  segments: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      text: z.string(),
      avg_logprob: z.number().nullable(),
      no_speech_prob: z.number().nullable(),
    }),
  ),
  audio_quality: audioQualitySchema,
  noise_reduction: z.object({
    enabled: z.boolean(),
    attempted: z.boolean(),
    selected_audio: z.literal("original"),
    reason: z.string(),
    requires_retry: z.boolean(),
    original: z.object({ raw_transcript: z.string() }),
    enhanced: z
      .object({
        raw_transcript: z.string(),
        segments: z.array(
          z.object({
            start: z.number(),
            end: z.number(),
            text: z.string(),
            avg_logprob: z.number().nullable(),
            no_speech_prob: z.number().nullable(),
          }),
        ),
      })
      .nullable(),
    processing: noiseProcessingSchema,
  }),
  performance: z.object({
    preprocessing_seconds: z.number(),
    inference_seconds: z.number(),
    total_request_seconds: z.number(),
    real_time_factor: z.number().nullable(),
  }),
  device: z.string(),
  compute_type: z.string(),
  sandbox_attempt_id: z.number().int(),
});

export type SpeechModelStatus = z.infer<typeof modelStatusSchema>;
export type NuSandboxResult = z.infer<typeof nuResultSchema>;
export type MuSandboxResult = z.infer<typeof muResultSchema>;
export type SpeechContentCatalog = z.infer<typeof speechContentCatalogSchema>;
export type SpeechContentItem = z.infer<typeof speechContentItemSchema>;
export type EquivalenceBook = z.infer<typeof equivalenceBookSchema>;
export type RawConfusionMatrix = z.infer<typeof rawConfusionMatrixSchema>;

async function parseResponse(response: Response): Promise<unknown> {
  const payload = await response.json();
  if (!response.ok) {
    const parsed = z
      .object({ message: z.string().optional(), detail: z.string().optional() })
      .safeParse(payload);
    throw new Error(
      parsed.success
        ? (parsed.data.message ??
            parsed.data.detail ??
            "Speech request failed.")
        : "Speech request failed.",
    );
  }
  return payload;
}

export async function getSpeechModelStatus(staffUserId: number) {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/speech/status`,
  );
  return speechStatusSchema.parse(await parseResponse(response));
}

export async function getSpeechContentCatalog(
  staffUserId: number,
): Promise<SpeechContentCatalog> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/speech/content-catalog`,
  );
  return speechContentCatalogSchema.parse(await parseResponse(response));
}

export async function getEquivalenceBook(
  staffUserId: number,
): Promise<EquivalenceBook> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/equivalence-rules`,
  );
  return equivalenceBookSchema.parse(await parseResponse(response));
}

export async function getRawConfusionMatrix(
  staffUserId: number,
  filters: { fixtureSet?: string; taskType?: string } = {},
): Promise<RawConfusionMatrix> {
  const search = new URLSearchParams();
  if (filters.fixtureSet) {
    search.set("fixture_set", filters.fixtureSet);
  }
  if (filters.taskType) {
    search.set("task_type", filters.taskType);
  }
  const query = search.size ? `?${search.toString()}` : "";
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/speech/confusion-matrix/raw${query}`,
  );
  return rawConfusionMatrixSchema.parse(await parseResponse(response));
}

export async function updateEquivalenceRuleStatus(
  staffUserId: number,
  ruleId: number,
  isActive: boolean,
): Promise<void> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/equivalence-rules/${ruleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    },
  );
  await parseResponse(response);
}

export async function classifyWithNu(
  staffUserId: number,
  audio: File,
  expectedLetter: string,
): Promise<NuSandboxResult> {
  const body = new FormData();
  body.append("audio", audio);
  body.append("expected_letter", expectedLetter);
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/speech/letter/resolve`,
    {
      method: "POST",
      body,
    },
  );
  return nuResultSchema.parse(await parseResponse(response));
}

export async function transcribeWithMu(
  staffUserId: number,
  audio: File,
  expectedText: string,
  taskType: string,
  itemKey?: string,
): Promise<MuSandboxResult> {
  const body = new FormData();
  body.append("audio", audio);
  body.append("expected_text", expectedText);
  body.append("task_type", taskType);
  if (itemKey) {
    body.append("item_key", itemKey);
  }
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/speech/mu/transcribe`,
    {
      method: "POST",
      body,
    },
  );
  return muResultSchema.parse(await parseResponse(response));
}

export async function createEquivalenceRule(
  staffUserId: number,
  input: {
    rule_type: string;
    expected_text: string;
    recognized_text: string;
    scope: string;
    item_key?: string;
    notes?: string;
    sandbox_attempt_id?: number;
  },
): Promise<void> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/equivalence-rules`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, review_outcome: "expected_correct" }),
    },
  );
  await parseResponse(response);
}
