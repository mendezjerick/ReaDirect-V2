import { z } from "zod";

import { staffFetch } from "../staff-auth/staffApi";

const staffResponseReviewSchema = z.object({
  id: z.number().int().positive(),
  reviewed_transcript: z.string(),
  reviewed_decision: z.enum(["CORRECT", "INCORRECT", "UNSCORABLE", "SKIPPED"]),
  notes: z.string().nullable(),
  reviewed_at: z.string().nullable(),
});

const audioReviewItemSchema = z.object({
  id: z.string(),
  response_kind: z.enum(["assessment", "lesson"]),
  response_id: z.number().int().positive(),
  learner: z.object({
    id: z.number().int().positive(),
    learner_code: z.string(),
    full_name: z.string(),
  }),
  source_title: z.string(),
  group_key: z.string(),
  item_key: z.string(),
  original_transcript: z.string().nullable(),
  original_decision: z.string().nullable(),
  occurred_at: z.string().nullable(),
  audio_url: z.string(),
  latest_review: staffResponseReviewSchema.nullable(),
});

const teacherAudioReviewSchema = z.object({
  summary: z.object({
    recordings: z.number().int().nonnegative(),
    reviewed: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
  items: z.array(audioReviewItemSchema),
});

const createReviewResponseSchema = z.object({
  review: staffResponseReviewSchema,
  canonical_records_changed: z.literal(false),
});

export type TeacherAudioReview = z.infer<typeof teacherAudioReviewSchema>;
export type TeacherAudioReviewItem = z.infer<typeof audioReviewItemSchema>;

export async function getTeacherAudioReviews(
  staffUserId: number,
): Promise<TeacherAudioReview> {
  const response = await staffFetch(
    `/api/staff/teacher/${staffUserId}/audio-reviews`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error("Audio review evidence could not be loaded.");
  }

  return teacherAudioReviewSchema.parse(await response.json());
}

export async function loadTeacherReviewAudio(audioUrl: string): Promise<Blob> {
  const response = await staffFetch(audioUrl, {
    headers: { Accept: "audio/*" },
  });

  if (!response.ok) {
    throw new Error("The saved recording could not be loaded.");
  }

  return response.blob();
}

export async function createTeacherAudioReview(input: {
  staffUserId: number;
  item: TeacherAudioReviewItem;
  reviewedTranscript: string;
  reviewedDecision: "CORRECT" | "INCORRECT" | "UNSCORABLE" | "SKIPPED";
  notes: string;
}) {
  const response = await staffFetch(
    `/api/staff/teacher/${input.staffUserId}/audio-reviews/${input.item.response_kind}/${input.item.response_id}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reviewed_transcript: input.reviewedTranscript,
        reviewed_decision: input.reviewedDecision,
        notes: input.notes || null,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("The staff review could not be saved.");
  }

  return createReviewResponseSchema.parse(await response.json());
}
