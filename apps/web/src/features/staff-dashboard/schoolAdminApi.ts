import { z } from "zod";

import { staffFetch } from "../staff-auth/staffApi";
import {
  teacherLearnerDetailSchema,
  type TeacherLearnerDetail,
} from "./teacherLearnerDetailApi";

const schoolProfileSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  teachers: z.number().int().nonnegative(),
  learners: z.number().int().nonnegative(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

const schoolProfileResponseSchema = z.object({
  school: schoolProfileSchema,
});

const schoolClassSchema = z.object({
  id: z.number().int().positive(),
  teacher_name: z.string(),
  username: z.string().nullable(),
  grade_level: z.number().int().min(1).max(6),
  section: z.string(),
  is_active: z.boolean(),
  learner_count: z.number().int().nonnegative(),
  active_learner_count: z.number().int().nonnegative(),
});

const schoolClassListSchema = z.object({
  classes: z.array(schoolClassSchema),
});

const schoolClassResponseSchema = z.object({
  class: schoolClassSchema,
});

const schoolLearnerSchema = z.object({
  id: z.number().int().positive(),
  learner_code: z.string().regex(/^[A-Z]{2}\d{3}$/),
  full_name: z.string(),
  grade_level: z.number().int().min(1).max(6).nullable(),
  section: z.string().nullable(),
  is_active: z.boolean(),
  progress_stage: z.string(),
  teacher: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
      username: z.string().nullable(),
    })
    .nullable(),
});

const schoolLearnerListSchema = z.object({
  learners: z.array(schoolLearnerSchema),
});

const reportAssessmentSchema = z.object({
  status: z.enum(["not_started", "active", "completed"]),
  score: z.number().int().nullable(),
  profile: z.string().nullable(),
  completed_at: z.string().nullable(),
});

const schoolReportLearnerSchema = z.object({
  learner_id: z.number().int().positive(),
  learner_code: z.string(),
  learner_name: z.string(),
  active: z.boolean(),
  stage: z.string(),
  stage_label: z.string(),
  diagnostic: reportAssessmentSchema,
  required_lessons_completed: z.number().int().min(0).max(6),
  final: reportAssessmentSchema,
  skipped_items: z.number().int().nonnegative(),
  review_recommended_items: z.number().int().nonnegative(),
  has_review_evidence: z.boolean(),
  teacher: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    username: z.string().nullable(),
  }),
  grade_level: z.number().int().min(1).max(6),
  section: z.string(),
});

const schoolReportSummarySchema = z.object({
  teachers: z.number().int().nonnegative().optional(),
  classes: z.number().int().nonnegative().optional(),
  learners: z.number().int().nonnegative(),
  diagnostic_complete: z.number().int().nonnegative(),
  all_lessons_complete: z.number().int().nonnegative(),
  final_complete: z.number().int().nonnegative(),
  with_review_evidence: z.number().int().nonnegative(),
});

const schoolReportSchema = z.object({
  school: z.object({
    id: z.number().int().positive(),
    name: z.string(),
  }),
  generated_at: z.string(),
  summary: schoolReportSummarySchema,
  classes: z.array(
    z.object({
      teacher: z.object({
        id: z.number().int().positive(),
        name: z.string(),
        username: z.string().nullable(),
      }),
      grade_level: z.number().int().min(1).max(6),
      section: z.string(),
      summary: schoolReportSummarySchema,
      learners: z.array(schoolReportLearnerSchema),
    }),
  ),
  learners: z.array(schoolReportLearnerSchema),
});

const distributionSchema = z.array(
  z.object({
    label: z.string(),
    value: z.number().int().nonnegative(),
  }),
);

const teacherDashboardReviewSchema = z.object({
  teacher: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    username: z.string().nullable(),
    is_active: z.boolean(),
    grade_level: z.number().int().min(1).max(6),
    section: z.string(),
  }),
  overview: z.object({
    metrics: z.object({
      total_learners: z.number().int().nonnegative(),
      diagnostic_complete: z.number().int().nonnegative(),
      diagnostic_pending: z.number().int().nonnegative(),
      ready_for_final: z.number().int().nonnegative(),
      final_complete: z.number().int().nonnegative(),
    }),
    part_one_distribution: distributionSchema,
    diagnostic_reading_profile_distribution: distributionSchema,
    final_reading_profile_distribution: distributionSchema,
    recent_learner_activity: z.array(
      z.object({
        id: z.string(),
        learner_id: z.number().int().positive(),
        learner_code: z.string(),
        learner_name: z.string(),
        activity_type: z.string(),
        title: z.string(),
        status: z.string(),
        occurred_at: z.string().nullable(),
      }),
    ),
  }),
  report: z.object({
    summary: schoolReportSummarySchema,
    learners: z.array(
      schoolReportLearnerSchema.omit({
        teacher: true,
        grade_level: true,
        section: true,
      }),
    ),
  }),
  read_only: z.literal(true),
  impersonating: z.literal(false),
  generated_at: z.string(),
});

export type SchoolAdminProfile = z.infer<typeof schoolProfileSchema>;
export type SchoolAdminClass = z.infer<typeof schoolClassSchema>;
export type SchoolAdminLearner = z.infer<typeof schoolLearnerSchema>;
export type SchoolAdminReport = z.infer<typeof schoolReportSchema>;
export type SchoolAdminTeacherDashboard = z.infer<
  typeof teacherDashboardReviewSchema
>;

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    errors?: Record<string, string[]>;
  } | null;

  return (
    body?.errors?.school_name?.[0] ??
    body?.message ??
    "ReaDirect could not complete that request."
  );
}

export async function getSchoolAdminProfile(
  staffUserId: number,
): Promise<SchoolAdminProfile> {
  const response = await staffFetch(
    `/api/staff/school-admin/${staffUserId}/school-profile`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return schoolProfileResponseSchema.parse(await response.json()).school;
}

export async function updateSchoolAdminProfile(input: {
  staffUserId: number;
  schoolName: string;
}): Promise<SchoolAdminProfile> {
  const response = await staffFetch(
    `/api/staff/school-admin/${input.staffUserId}/school-profile`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ school_name: input.schoolName }),
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return schoolProfileResponseSchema.parse(await response.json()).school;
}

export async function getSchoolAdminClasses(
  staffUserId: number,
): Promise<SchoolAdminClass[]> {
  const response = await staffFetch(
    `/api/staff/school-admin/${staffUserId}/classes`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return schoolClassListSchema.parse(await response.json()).classes;
}

export async function updateSchoolAdminClass(input: {
  staffUserId: number;
  teacherId: number;
  gradeLevel: number;
  section: string;
}): Promise<SchoolAdminClass> {
  const response = await staffFetch(
    `/api/staff/school-admin/${input.staffUserId}/classes/${input.teacherId}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grade_level: input.gradeLevel,
        section: input.section,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return schoolClassResponseSchema.parse(await response.json()).class;
}

export async function getSchoolAdminLearners(
  staffUserId: number,
): Promise<SchoolAdminLearner[]> {
  const response = await staffFetch(
    `/api/staff/school-admin/${staffUserId}/learners`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return schoolLearnerListSchema.parse(await response.json()).learners;
}

export async function getSchoolAdminLearnerDetail(
  staffUserId: number,
  learnerId: number,
): Promise<TeacherLearnerDetail> {
  const response = await staffFetch(
    `/api/staff/school-admin/${staffUserId}/learners/${learnerId}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "This Learner is outside your school or unavailable."
        : await readError(response),
    );
  }

  return teacherLearnerDetailSchema.parse(await response.json());
}

export async function getSchoolAdminReport(
  staffUserId: number,
): Promise<SchoolAdminReport> {
  const response = await staffFetch(
    `/api/staff/school-admin/${staffUserId}/reports`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return schoolReportSchema.parse(await response.json());
}

export async function getSchoolAdminTeacherDashboard(
  staffUserId: number,
  teacherId: number,
): Promise<SchoolAdminTeacherDashboard> {
  const response = await staffFetch(
    `/api/staff/school-admin/${staffUserId}/teacher-dashboards/${teacherId}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "This Teacher is outside your school or unavailable."
        : await readError(response),
    );
  }

  return teacherDashboardReviewSchema.parse(await response.json());
}
