import { z } from "zod";

import { staffFetch } from "../staff-auth/staffApi";

const assessmentTypeSchema = z.enum(["diagnostic", "final"]);

const teacherAssessmentReviewSchema = z.object({
  assessment_type: assessmentTypeSchema,
  metrics: z.object({
    total_learners: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    not_ready: z.number().int().nonnegative(),
    ready: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    with_skipped_items: z.number().int().nonnegative(),
  }),
  learners: z.array(
    z.object({
      learner: z.object({
        id: z.number().int().positive(),
        learner_code: z.string(),
        full_name: z.string(),
      }),
      status: z.enum([
        "pending",
        "not_ready",
        "ready",
        "in_progress",
        "completed",
      ]),
      part_one_score: z.number().int().nullable(),
      part_one_level: z.string().nullable(),
      reading_accuracy_percent: z.number().int().nullable(),
      comprehension_score: z.number().int().nullable(),
      comprehension_percent: z.number().int().nullable(),
      final_reading_score: z.number().int().nullable(),
      final_reading_profile: z.string().nullable(),
      skipped_items_count: z.number().int().nonnegative(),
      completed_at: z.string().nullable(),
      last_activity_at: z.string().nullable(),
    }),
  ),
  generated_at: z.string(),
});

export type TeacherAssessmentType = z.infer<typeof assessmentTypeSchema>;
export type TeacherAssessmentReview = z.infer<
  typeof teacherAssessmentReviewSchema
>;

export async function getTeacherAssessmentReview(
  staffUserId: number,
  assessmentType: TeacherAssessmentType,
): Promise<TeacherAssessmentReview> {
  const response = await staffFetch(
    `/api/staff/teacher/${staffUserId}/assessments/${assessmentType}`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(
      `The ${assessmentType === "final" ? "Final" : "Diagnostic"} Assessment review could not be loaded.`,
    );
  }

  return teacherAssessmentReviewSchema.parse(await response.json());
}
