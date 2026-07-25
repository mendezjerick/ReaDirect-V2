import { z } from "zod";

import { staffFetch } from "../staff-auth/staffApi";

const assessmentSummarySchema = z.object({
  status: z.enum(["not_started", "active", "completed"]),
  score: z.number().int().nullable(),
  profile: z.string().nullable(),
  completed_at: z.string().nullable(),
});

const teacherReportSchema = z.object({
  class_context: z.object({
    school: z.object({
      id: z.number().int().positive(),
      name: z.string(),
    }),
    grade_level: z.number().int().min(1).max(6),
    section: z.string(),
  }),
  generated_at: z.string(),
  summary: z.object({
    learners: z.number().int().nonnegative(),
    diagnostic_complete: z.number().int().nonnegative(),
    all_lessons_complete: z.number().int().nonnegative(),
    final_complete: z.number().int().nonnegative(),
    with_review_evidence: z.number().int().nonnegative(),
  }),
  learners: z.array(
    z.object({
      learner_id: z.number().int().positive(),
      learner_code: z.string(),
      learner_name: z.string(),
      active: z.boolean(),
      stage: z.string(),
      stage_label: z.string(),
      diagnostic: assessmentSummarySchema,
      required_lessons_completed: z.number().int().min(0).max(6),
      final: assessmentSummarySchema,
      skipped_items: z.number().int().nonnegative(),
      review_recommended_items: z.number().int().nonnegative(),
      has_review_evidence: z.boolean(),
    }),
  ),
});

export type TeacherReport = z.infer<typeof teacherReportSchema>;

export async function getTeacherReport(
  staffUserId: number,
): Promise<TeacherReport> {
  const response = await staffFetch(
    `/api/staff/teacher/${staffUserId}/reports`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error("The class progress report could not be loaded.");
  }

  return teacherReportSchema.parse(await response.json());
}
