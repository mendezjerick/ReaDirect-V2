import { z } from "zod";

import { staffFetch } from "../staff-auth/staffApi";

const teacherAnalyticsSchema = z.object({
  class_context: z.object({
    school_name: z.string(),
    grade_level: z.number().int().min(1).max(6),
    section: z.string(),
  }),
  generated_at: z.string(),
  cohort_size: z.number().int().nonnegative(),
  lesson_evidence: z.object({
    recorded_items: z.number().int().nonnegative(),
    independent_success: z.number().int().nonnegative(),
    supported_success: z.number().int().nonnegative(),
    demonstrated_items: z.number().int().nonnegative(),
    not_yet_correct: z.number().int().nonnegative(),
    unscorable_recordings: z.number().int().nonnegative(),
    review_recommended: z.number().int().nonnegative(),
    technical_retries: z.number().int().nonnegative(),
  }),
  assessment_skips: z.object({
    diagnostic: z.number().int().nonnegative(),
    final: z.number().int().nonnegative(),
  }),
  lesson_breakdown: z.array(
    z.object({
      lesson_key: z.string(),
      title: z.string(),
      cohort_size: z.number().int().nonnegative(),
      learners_started: z.number().int().nonnegative(),
      learners_completed: z.number().int().nonnegative(),
      recorded_items: z.number().int().nonnegative(),
      independent_success: z.number().int().nonnegative(),
      supported_success: z.number().int().nonnegative(),
      review_recommended: z.number().int().nonnegative(),
    }),
  ),
  diagnoses: z.array(
    z.object({
      diagnosis_key: z.string(),
      label: z.string(),
      items: z.number().int().positive(),
    }),
  ),
});

export type TeacherAnalytics = z.infer<typeof teacherAnalyticsSchema>;

export async function getTeacherAnalytics(
  staffUserId: number,
): Promise<TeacherAnalytics> {
  const response = await staffFetch(
    `/api/staff/teacher/${staffUserId}/analytics`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error("Teacher analytics could not be loaded.");
  }

  return teacherAnalyticsSchema.parse(await response.json());
}
