import { z } from "zod";

import { learnerReadingPathSchema } from "../learner-auth/learnerApi";
import { staffFetch } from "../staff-auth/staffApi";

const nullableDateSchema = z.string().nullable();

const assessmentSummarySchema = z
  .object({
    run_id: z.number().int().positive(),
    assessment_type: z.enum(["diagnostic", "final"]),
    status: z.string(),
    completion_mode: z.enum(["standard", "skipped"]),
    stage: z.string(),
    part_one_branch: z.string().nullable(),
    task_scores: z.object({
      task_1a: z.number().int().nullable(),
      task_2a: z.number().int().nullable(),
      task_2b: z.number().int().nullable(),
    }),
    part_one_score: z.number().int().nullable(),
    part_one_level: z.string().nullable(),
    reading_accuracy_percent: z.number().int().nullable(),
    comprehension_score: z.number().int().nullable(),
    comprehension_percent: z.number().int().nullable(),
    final_reading_score: z.number().int().nullable(),
    final_reading_profile: z.string().nullable(),
    responses_recorded: z.number().int().nonnegative(),
    skipped_items: z.number().int().nonnegative(),
    started_at: nullableDateSchema,
    part_one_completed_at: nullableDateSchema,
    part_two_completed_at: nullableDateSchema,
    completed_at: nullableDateSchema,
  })
  .nullable();

const lessonAttemptSchema = z.object({
  attempt_id: z.number().int().positive(),
  attempt_sequence: z.number().int().positive(),
  attempt_kind: z.string(),
  academic_attempt_number: z.number().int().positive().nullable(),
  scaffold_level: z.string(),
  classification: z.string(),
  decision: z.string(),
  final_transcript: z.string().nullable(),
  selected_response: z.string().nullable(),
  incorrect: z.boolean(),
  recorded_at: nullableDateSchema,
});

const lessonItemSchema = z.object({
  response_id: z.number().int().positive(),
  mission_key: z.string(),
  item_key: z.string(),
  item_order: z.number().int().positive(),
  target_label: z.string(),
  response_type: z.string(),
  decision: z.string(),
  outcome: z.string().nullable(),
  final_transcript: z.string().nullable(),
  academic_attempt_count: z.number().int().nonnegative(),
  technical_retry_count: z.number().int().nonnegative(),
  highest_scaffold_used: z.string(),
  independent_mastery: z.boolean(),
  diagnosis_key: z.string().nullable(),
  review_recommended: z.boolean(),
  practice_attempt_count: z.number().int().nonnegative(),
  attempts: z.array(lessonAttemptSchema),
  completed_at: nullableDateSchema,
});

const lessonSchema = z.object({
  lesson_key: z.string(),
  order: z.number().int().min(1).max(6),
  title: z.string(),
  status: z.string(),
  current_mission_key: z.string().nullable(),
  current_item_index: z.number().int().nonnegative().nullable(),
  items_total: z.number().int().nonnegative(),
  items_recorded: z.number().int().nonnegative(),
  completed_at: nullableDateSchema,
  performance: z.object({
    independent_correct: z.number().int().nonnegative(),
    supported_correct: z.number().int().nonnegative(),
    demonstrated: z.number().int().nonnegative(),
    not_yet_correct: z.number().int().nonnegative(),
    unscorable_audio: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    academic_attempts: z.number().int().nonnegative(),
    technical_retries: z.number().int().nonnegative(),
    practice_attempts: z.number().int().nonnegative(),
    review_recommended: z.number().int().nonnegative(),
  }),
  items: z.array(lessonItemSchema),
});

export const teacherLearnerDetailSchema = z.object({
  learner: z.object({
    id: z.number().int().positive(),
    learner_code: z.string().regex(/^[A-Z]{2}\d{3}$/),
    full_name: z.string(),
    first_name: z.string(),
    middle_name: z.string(),
    last_name: z.string(),
    suffix: z.string().nullable(),
    lrn: z.string().nullable(),
    is_active: z.boolean(),
    created_at: nullableDateSchema,
  }),
  class_context: z.object({
    school: z
      .object({
        id: z.number().int().positive(),
        name: z.string(),
      })
      .nullable(),
    grade_level: z.number().int().min(1).max(6).nullable(),
    section: z.string().nullable(),
    teacher: z
      .object({
        id: z.number().int().positive(),
        name: z.string(),
        username: z.string().nullable(),
      })
      .nullable()
      .optional(),
  }),
  progression: z.object({
    recorded: z.boolean(),
    stage: z.string(),
    stage_label: z.string(),
    current_required_lesson_order: z.number().int().positive().nullable(),
    diagnostic_completed_at: nullableDateSchema,
    final_assessment_completed_at: nullableDateSchema,
    last_confirmed_at: nullableDateSchema,
  }),
  reading_path: learnerReadingPathSchema,
  assessments: z.object({
    diagnostic: assessmentSummarySchema,
    final: assessmentSummarySchema,
  }),
  skipped_assessment_items: z.array(
    z.object({
      assessment_type: z.enum(["diagnostic", "final"]),
      assessment_label: z.string(),
      task_key: z.string(),
      task_label: z.string(),
      item_key: z.string(),
      item_order: z.number().int().positive(),
      item_label: z.string(),
      recorded_at: nullableDateSchema,
    }),
  ),
  lessons: z.array(lessonSchema),
  recommendations: z.array(
    z.object({
      key: z.string(),
      kind: z.string(),
      title: z.string(),
      reason: z.string(),
      evidence: z.record(z.string(), z.unknown()),
    }),
  ),
  generated_at: z.string(),
});

export type TeacherLearnerDetail = z.infer<typeof teacherLearnerDetailSchema>;
export type TeacherLearnerAssessment = NonNullable<
  TeacherLearnerDetail["assessments"]["diagnostic"]
>;
export type TeacherLearnerLesson = TeacherLearnerDetail["lessons"][number];
export type TeacherLearnerLessonItem = TeacherLearnerLesson["items"][number];

export async function getTeacherLearnerDetail(
  staffUserId: number,
  learnerId: number,
): Promise<TeacherLearnerDetail> {
  const response = await staffFetch(
    `/api/staff/teacher/${staffUserId}/learners/${learnerId}`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "This Learner is not assigned to your class or is unavailable.",
      );
    }

    throw new Error("The Learner workspace could not be loaded.");
  }

  return teacherLearnerDetailSchema.parse(await response.json());
}
