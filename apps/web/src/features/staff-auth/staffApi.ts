import { z } from "zod";

const staffSchoolSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

const staffAccountSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().nullable(),
  email: z.string().nullable(),
  display_name: z.string(),
  role: z.enum(["system_admin", "school_admin", "teacher"]),
  school: staffSchoolSchema.nullable(),
  requires_school_setup: z.boolean(),
  requires_credential_setup: z.boolean(),
  grade_level: z.number().int().min(1).max(6).nullable().optional(),
  section: z.string().nullable().optional(),
  requires_assignment_acknowledgement: z.boolean().optional(),
});

const staffSessionSchema = z.object({
  staff: staffAccountSchema,
});

const schoolAdminOverviewSchema = z.object({
  school: staffSchoolSchema,
  metrics: z.object({
    total_teachers: z.number().int().nonnegative(),
    total_learners: z.number().int().nonnegative(),
    active_learners: z.number().int().nonnegative(),
  }),
  part_one_distribution: z.array(
    z.object({
      label: z.string(),
      value: z.number().int().nonnegative(),
    }),
  ),
  recent_assessment_activity: z.array(z.unknown()),
  requires_credential_setup: z.boolean(),
  generated_at: z.string(),
});

const teacherOverviewSchema = z.object({
  school: staffSchoolSchema,
  assignment: z.object({
    grade_level: z.number().int().min(1).max(6),
    section: z.string(),
  }),
  metrics: z.object({
    total_learners: z.number().int().nonnegative(),
    diagnostic_complete: z.number().int().nonnegative(),
    diagnostic_pending: z.number().int().nonnegative(),
    ready_for_final: z.number().int().nonnegative(),
    final_complete: z.number().int().nonnegative(),
  }),
  part_one_distribution: z.array(
    z.object({
      label: z.string(),
      value: z.number().int().nonnegative(),
    }),
  ),
  diagnostic_reading_profile_distribution: z.array(
    z.object({
      label: z.string(),
      value: z.number().int().nonnegative(),
    }),
  ),
  final_reading_profile_distribution: z.array(
    z.object({
      label: z.string(),
      value: z.number().int().nonnegative(),
    }),
  ),
  recent_learner_activity: z.array(z.unknown()),
  teacher_lessons: z.array(z.unknown()),
  requires_assignment_acknowledgement: z.boolean(),
  requires_credential_setup: z.boolean(),
  generated_at: z.string(),
});

const teacherAssignmentAcknowledgementSchema = z.object({
  requires_assignment_acknowledgement: z.literal(false),
  acknowledged_at: z.string().nullable(),
});

const distributionItemSchema = z.object({
  label: z.string(),
  value: z.number().int().nonnegative(),
});

const systemHealthItemSchema = z.object({
  service: z.string(),
  status: z.enum(["online", "not_configured"]),
  detail: z.string(),
});

const recentActionSchema = z.object({
  id: z.number().int().positive(),
  description: z.string(),
  actor: z.string(),
  occurred_at: z.string().nullable(),
});

const systemAdminOverviewSchema = z.object({
  metrics: z.object({
    total_schools: z.number().int().nonnegative(),
    total_teachers: z.number().int().nonnegative(),
    total_learners: z.number().int().nonnegative(),
    sandbox_attempts: z.number().int().nonnegative(),
  }),
  part_one_distribution: z.array(distributionItemSchema),
  reading_profile_distribution: z.array(distributionItemSchema),
  system_health: z.array(systemHealthItemSchema),
  speech_processing: z.object({
    conditional_mu_noise_reduction_enabled: z.boolean(),
    default_mode: z.literal("raw_first"),
  }),
  recent_assessment_activity: z.array(z.unknown()),
  recent_actions: z.array(recentActionSchema),
  generated_at: z.string(),
});

const apiErrorSchema = z.object({
  message: z.string().optional(),
  errors: z
    .object({
      identifier: z.array(z.string()).optional(),
      password: z.array(z.string()).optional(),
      username: z.array(z.string()).optional(),
      temporary_password: z.array(z.string()).optional(),
      school_name: z.array(z.string()).optional(),
      grade_level: z.array(z.string()).optional(),
      section: z.array(z.string()).optional(),
      first_name: z.array(z.string()).optional(),
      middle_name: z.array(z.string()).optional(),
      last_name: z.array(z.string()).optional(),
      suffix: z.array(z.string()).optional(),
      lrn: z.array(z.string()).optional(),
    })
    .optional(),
});

export type StaffSession = z.infer<typeof staffSessionSchema>;
export type SchoolAdminOverview = z.infer<typeof schoolAdminOverviewSchema>;
export type TeacherOverview = z.infer<typeof teacherOverviewSchema>;
export type SystemAdminOverview = z.infer<typeof systemAdminOverviewSchema>;

const portalTargetKeySchema = z.enum([
  "assessment-orientation",
  "assessment-task-1a",
  "assessment-task-2a",
  "assessment-task-2b",
  "assessment-part-1-results",
  "assessment-story-selection",
  "assessment-task-3a",
  "assessment-task-3b",
  "assessment-part-2-results",
  "assessment-complete",
  "lesson-1-mission-1",
  "lesson-1-mission-2",
  "lesson-1-mission-3",
  "lesson-1-complete",
]);

const portalTargetSchema = z.object({
  key: portalTargetKeySchema,
  label: z.string(),
  description: z.string(),
  task: z.string(),
});

const portalSystemLearnerSchema = z.object({
  learner: z.object({
    id: z.number().int().positive(),
    learner_code: z.literal("KW000"),
    full_name: z.string(),
    account_purpose: z.literal("portal_system"),
    is_active: z.boolean(),
    analytics_excluded: z.literal(true),
    progress_stage: z.string(),
    last_reset_at: z.string().nullable(),
    active_standard_sessions: z.number().int().nonnegative(),
    active_portal_run: z
      .object({
        id: z.number().int().positive(),
        target_key: z.string(),
        started_at: z.string(),
        expires_at: z.string(),
      })
      .nullable(),
  }),
  portal_launch: z.object({
    available: z.boolean(),
    reason: z.string(),
    targets: z.array(portalTargetSchema),
  }),
});

const portalLearnerSessionSchema = z.object({
  token: z.string().min(1),
  learner: z.object({
    id: z.number().int().positive(),
    learner_code: z.literal("KW000"),
    full_name: z.string(),
    first_name: z.string(),
    account_purpose: z.literal("portal_system"),
    school: z.string().nullable(),
    grade_level: z.number().int().min(1).max(6).nullable(),
    section: z.string().nullable(),
    progress: z.object({
      stage: z.string(),
      current_required_lesson_order: z.number().int().positive().nullable(),
    }),
    achievement_keys: z.array(z.string()).default([]),
  }),
  session: z.object({ expires_at: z.string() }),
});

const portalLaunchResponseSchema = portalSystemLearnerSchema.extend({
  message: z.string(),
  launch: z.object({
    target_key: portalTargetKeySchema,
    route: z.string().startsWith("/learner/"),
    learner_session: portalLearnerSessionSchema,
  }),
});

export type PortalSystemLearner = z.infer<typeof portalSystemLearnerSchema>;
export type PortalTargetKey = z.infer<typeof portalTargetKeySchema>;
export type PortalLaunchResponse = z.infer<typeof portalLaunchResponseSchema>;

const staffSessionStorageKey = "readirect.staff-session";

export function saveStaffSession(session: StaffSession): void {
  window.sessionStorage.setItem(
    staffSessionStorageKey,
    JSON.stringify(session),
  );
}

export function loadStaffSession(): StaffSession | null {
  const storedSession = window.sessionStorage.getItem(staffSessionStorageKey);

  if (!storedSession) {
    return null;
  }

  let storedValue: unknown;

  try {
    storedValue = JSON.parse(storedSession);
  } catch {
    window.sessionStorage.removeItem(staffSessionStorageKey);
    return null;
  }

  const parsed = staffSessionSchema.safeParse(storedValue);

  if (!parsed.success) {
    window.sessionStorage.removeItem(staffSessionStorageKey);
    return null;
  }

  return parsed.data;
}

export function clearStaffSession(): void {
  window.sessionStorage.removeItem(staffSessionStorageKey);
}

async function readApiError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);

  if (!parsed.success) {
    return "ReaDirect could not complete that request.";
  }

  return (
    parsed.data.errors?.identifier?.[0] ??
    parsed.data.errors?.password?.[0] ??
    parsed.data.errors?.username?.[0] ??
    parsed.data.errors?.temporary_password?.[0] ??
    parsed.data.errors?.school_name?.[0] ??
    parsed.data.errors?.grade_level?.[0] ??
    parsed.data.errors?.section?.[0] ??
    parsed.data.errors?.first_name?.[0] ??
    parsed.data.errors?.middle_name?.[0] ??
    parsed.data.errors?.last_name?.[0] ??
    parsed.data.errors?.suffix?.[0] ??
    parsed.data.errors?.lrn?.[0] ??
    parsed.data.message ??
    "ReaDirect could not complete that request."
  );
}

const schoolAdministratorSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
  display_name: z.string(),
  is_active: z.boolean(),
  school: z.string().nullable(),
  requires_school_setup: z.boolean(),
  requires_credential_setup: z.boolean(),
  created_at: z.string().nullable(),
});

const schoolAdministratorListSchema = z.object({
  school_administrators: z.array(schoolAdministratorSchema),
});

const schoolAdministratorResponseSchema = z.object({
  school_administrator: schoolAdministratorSchema,
});

export type SchoolAdministrator = z.infer<typeof schoolAdministratorSchema>;

export async function getSchoolAdministrators(): Promise<
  SchoolAdministrator[]
> {
  const response = await fetch(
    "/api/staff/system-admin/school-administrators",
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return schoolAdministratorListSchema.parse(await response.json())
    .school_administrators;
}

export async function createSchoolAdministrator(credentials: {
  username: string;
  temporary_password: string;
}): Promise<SchoolAdministrator> {
  const response = await fetch(
    "/api/staff/system-admin/school-administrators",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return schoolAdministratorResponseSchema.parse(await response.json())
    .school_administrator;
}

const teacherSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
  display_name: z.string(),
  is_active: z.boolean(),
  grade_level: z.number().int().min(1).max(6),
  section: z.string(),
  requires_credential_setup: z.boolean(),
  created_at: z.string().nullable(),
});

const teacherListSchema = z.object({
  teachers: z.array(teacherSchema),
});

const teacherResponseSchema = z.object({
  teacher: teacherSchema,
});

export type TeacherAccount = z.infer<typeof teacherSchema>;

export async function getSchoolAdminTeachers(
  staffUserId: number,
): Promise<TeacherAccount[]> {
  const response = await fetch(
    `/api/staff/school-admin/${staffUserId}/teachers`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return teacherListSchema.parse(await response.json()).teachers;
}

export async function createTeacherAccount(input: {
  staffUserId: number;
  username: string;
  temporaryPassword: string;
  gradeLevel: number;
  section: string;
}): Promise<TeacherAccount> {
  const response = await fetch(
    `/api/staff/school-admin/${input.staffUserId}/teachers`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: input.username,
        temporary_password: input.temporaryPassword,
        grade_level: input.gradeLevel,
        section: input.section,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return teacherResponseSchema.parse(await response.json()).teacher;
}

const learnerAccountSchema = z.object({
  id: z.number().int().positive(),
  learner_code: z.string().regex(/^[A-Z]{2}\d{3}$/),
  first_name: z.string(),
  middle_name: z.string(),
  last_name: z.string(),
  suffix: z.string().nullable(),
  full_name: z.string(),
  lrn: z.string().nullable(),
  grade_level: z.number().int().min(1).max(6),
  section: z.string(),
  is_active: z.boolean(),
  created_at: z.string().nullable(),
});

const learnerListSchema = z.object({
  learners: z.array(learnerAccountSchema),
});

const createdLearnerSchema = learnerAccountSchema.extend({
  temporary_password: z.string().regex(/^(apple|orange|lemon)\d{3}$/),
});

const createdLearnerResponseSchema = z.object({
  learner: createdLearnerSchema,
});

export type LearnerAccount = z.infer<typeof learnerAccountSchema>;
export type CreatedLearnerAccount = z.infer<typeof createdLearnerSchema>;

export async function getTeacherLearners(
  staffUserId: number,
): Promise<LearnerAccount[]> {
  const response = await fetch(`/api/staff/teacher/${staffUserId}/learners`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return learnerListSchema.parse(await response.json()).learners;
}

export async function createLearnerAccount(input: {
  staffUserId: number;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  lrn: string;
}): Promise<CreatedLearnerAccount> {
  const response = await fetch(
    `/api/staff/teacher/${input.staffUserId}/learners`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: input.firstName,
        middle_name: input.middleName,
        last_name: input.lastName,
        suffix: input.suffix,
        lrn: input.lrn,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return createdLearnerResponseSchema.parse(await response.json()).learner;
}

export async function loginStaff(credentials: {
  identifier: string;
  password: string;
}): Promise<StaffSession> {
  const response = await fetch("/api/staff/login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return staffSessionSchema.parse(await response.json());
}

export async function getSystemAdminOverview(): Promise<SystemAdminOverview> {
  const response = await fetch("/api/staff/system-admin/overview", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminOverviewSchema.parse(await response.json());
}

const speechProcessingResponseSchema = z.object({
  speech_processing: systemAdminOverviewSchema.shape.speech_processing,
});

export async function updateConditionalMuNoiseReduction(
  staffUserId: number,
  enabled: boolean,
): Promise<SystemAdminOverview["speech_processing"]> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/speech-settings/mu-noise-reduction`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return speechProcessingResponseSchema.parse(await response.json())
    .speech_processing;
}

export async function getPortalSystemLearner(
  staffUserId: number,
): Promise<PortalSystemLearner> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/page-portals`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return portalSystemLearnerSchema.parse(await response.json());
}

export async function resetPortalSystemLearner(
  staffUserId: number,
): Promise<PortalSystemLearner> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/page-portals/reset-kristen`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return portalSystemLearnerSchema.parse(await response.json());
}

export async function launchPortalSystemLearner(
  staffUserId: number,
  targetKey: PortalTargetKey,
): Promise<PortalLaunchResponse> {
  const response = await fetch(
    `/api/staff/system-admin/${staffUserId}/page-portals/launch`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target_key: targetKey }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return portalLaunchResponseSchema.parse(await response.json());
}

export async function completeSchoolAdminSetup(input: {
  staffUserId: number;
  schoolName: string;
}): Promise<StaffSession> {
  const response = await fetch(
    `/api/staff/school-admin/${input.staffUserId}/school`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ school_name: input.schoolName }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return staffSessionSchema.parse(await response.json());
}

export async function getSchoolAdminOverview(
  staffUserId: number,
): Promise<SchoolAdminOverview> {
  const response = await fetch(
    `/api/staff/school-admin/${staffUserId}/overview`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return schoolAdminOverviewSchema.parse(await response.json());
}

export async function getTeacherOverview(
  staffUserId: number,
): Promise<TeacherOverview> {
  const response = await fetch(`/api/staff/teacher/${staffUserId}/overview`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return teacherOverviewSchema.parse(await response.json());
}

export async function acknowledgeTeacherAssignment(
  staffUserId: number,
): Promise<z.infer<typeof teacherAssignmentAcknowledgementSchema>> {
  const response = await fetch(
    `/api/staff/teacher/${staffUserId}/assignment-acknowledgement`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return teacherAssignmentAcknowledgementSchema.parse(await response.json());
}
