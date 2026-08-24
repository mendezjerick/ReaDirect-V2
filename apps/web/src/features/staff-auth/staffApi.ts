import { z } from "zod";

import { readApiJson } from "../../lib/apiResponse";
import {
  apiFetchWithNormalTimeout as fetch,
  apiFetchWithTimeout,
} from "../../lib/apiUrl";
import {
  getNativeSessionCache,
  isNativeSecureSessionAvailable,
  persistNativeSession,
  removeNativeSession,
  setNativeSessionCache,
} from "../../app/nativeSecureSession";
import {
  learnerReadingPathSchema,
  learnerSpeechLanguageSchema,
} from "../learner-auth/learnerApi";

const staffSchoolSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

const staffAccountSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().nullable(),
  email: z.string().nullable(),
  email_verified_at: z.string().nullable().default(null),
  display_name: z.string(),
  role: z.enum(["system_admin", "school_admin", "teacher"]),
  school: staffSchoolSchema.nullable(),
  requires_school_setup: z.boolean(),
  requires_credential_setup: z.boolean(),
  grade_level: z.number().int().min(1).max(6).nullable().optional(),
  section: z.string().nullable().optional(),
  requires_assignment_acknowledgement: z.boolean().optional(),
});

const staffIdentitySessionSchema = z.object({
  staff: staffAccountSchema,
  session: z.object({
    expires_at: z.string(),
    remembered: z.boolean().default(false),
    heartbeat_interval_seconds: z
      .number()
      .int()
      .min(10)
      .nullable()
      .default(null),
  }),
});

const staffSessionSchema = staffIdentitySessionSchema.extend({
  token: z.string().min(32),
});

const staffAccountResponseSchema = z.object({
  staff: staffAccountSchema,
});

const schoolAssessmentActivitySchema = z.object({
  id: z.number().int().positive(),
  learner_id: z.number().int().positive(),
  learner_code: z.string(),
  learner_name: z.string(),
  teacher_username: z.string().nullable(),
  assessment_type: z.enum(["diagnostic", "final"]),
  assessment_label: z.string(),
  status: z.string(),
  completion_mode: z.enum(["standard", "skipped"]),
  score: z.number().int().nullable(),
  profile: z.string().nullable(),
  occurred_at: z.string().nullable(),
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
  recent_assessment_activity: z.array(schoolAssessmentActivitySchema),
  requires_credential_setup: z.boolean(),
  generated_at: z.string(),
});

const teacherRecentActivitySchema = z.object({
  id: z.string(),
  learner_id: z.number().int().positive(),
  learner_code: z.string(),
  learner_name: z.string(),
  activity_type: z.enum([
    "diagnostic_assessment",
    "final_assessment",
    "lesson",
  ]),
  title: z.string(),
  status: z.enum(["completed", "in_progress", "skipped"]),
  occurred_at: z.string().nullable(),
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
  recent_learner_activity: z.array(teacherRecentActivitySchema),
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
  status: z.enum(["online", "degraded", "offline", "not_configured"]),
  detail: z.string(),
});

const systemAssessmentActivitySchema = z.object({
  id: z.number().int().positive(),
  learner_id: z.number().int().positive(),
  learner_code: z.string(),
  learner_name: z.string(),
  school_name: z.string().nullable(),
  assessment_type: z.enum(["diagnostic", "final"]),
  assessment_label: z.string(),
  status: z.string(),
  score: z.number().int().nullable(),
  profile: z.string().nullable(),
  occurred_at: z.string().nullable(),
});

const systemSpeechFailureSchema = z.object({
  id: z.number().int().positive(),
  source: z.string(),
  mode: z.enum(["letter", "general"]),
  status_code: z.number().int().nullable(),
  summary: z.string(),
  occurred_at: z.string().nullable(),
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
  recent_assessment_activity: z.array(systemAssessmentActivitySchema),
  recent_speech_failures: z.array(systemSpeechFailureSchema),
  recent_actions: z.array(recentActionSchema),
  generated_at: z.string(),
});

const systemAdminSchoolCountSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
});

const systemAdminSchoolDirectorySchema = z.object({
  summary: z.object({
    total_schools: z.number().int().nonnegative(),
    active_school_administrators: z.number().int().nonnegative(),
    active_teachers: z.number().int().nonnegative(),
    active_learners: z.number().int().nonnegative(),
    unassigned_school_administrators: z.number().int().nonnegative(),
  }),
  schools: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      school_administrators: systemAdminSchoolCountSchema,
      teachers: systemAdminSchoolCountSchema,
      learners: systemAdminSchoolCountSchema,
      created_at: z.string().nullable(),
    }),
  ),
  generated_at: z.string(),
});

const systemAdminTeacherDirectorySchema = z.object({
  summary: z.object({
    total_teachers: z.number().int().nonnegative(),
    active_teachers: z.number().int().nonnegative(),
    active_standard_learners: z.number().int().nonnegative(),
    pending_assignment_acknowledgements: z.number().int().nonnegative(),
    incomplete_assignments: z.number().int().nonnegative(),
    schools_represented: z.number().int().nonnegative(),
  }),
  teachers: z.array(
    z.object({
      id: z.number().int().positive(),
      username: z.string().nullable(),
      display_name: z.string(),
      is_active: z.boolean(),
      school: staffSchoolSchema.nullable(),
      grade_level: z.number().int().min(1).max(6).nullable(),
      section: z.string().nullable(),
      assignment_complete: z.boolean(),
      requires_assignment_acknowledgement: z.boolean(),
      requires_credential_setup: z.boolean(),
      learners: systemAdminSchoolCountSchema,
      created_at: z.string().nullable(),
    }),
  ),
  generated_at: z.string(),
});

const systemAdminLearnerDirectorySchema = z.object({
  summary: z.object({
    total_learners: z.number().int().nonnegative(),
    active_learners: z.number().int().nonnegative(),
    diagnostic_completed: z.number().int().nonnegative(),
    final_assessment_completed: z.number().int().nonnegative(),
    without_teacher: z.number().int().nonnegative(),
    schools_represented: z.number().int().nonnegative(),
  }),
  learners: z.array(
    z.object({
      id: z.number().int().positive(),
      learner_code: z.string().regex(/^[A-Z]{2}\d{3}$/),
      full_name: z.string(),
      is_active: z.boolean(),
      school: staffSchoolSchema.nullable(),
      teacher: z
        .object({
          id: z.number().int().positive(),
          username: z.string().nullable(),
          display_name: z.string(),
          is_active: z.boolean(),
        })
        .nullable(),
      grade_level: z.number().int().min(1).max(6).nullable(),
      section: z.string().nullable(),
      progress: z.object({
        stage: z.string(),
        current_required_lesson_order: z
          .number()
          .int()
          .min(1)
          .max(6)
          .nullable(),
        diagnostic_completed: z.boolean(),
        final_assessment_completed: z.boolean(),
        last_confirmed_at: z.string().nullable(),
      }),
      reading_path: learnerReadingPathSchema,
      created_at: z.string().nullable(),
    }),
  ),
  generated_at: z.string(),
});

const learningContentGovernanceSchema = z.object({
  read_only: z.literal(true),
  message: z.string(),
});

const learningContentStatusSchema = z.enum(["ready", "attention"]);

const systemAdminAssessmentCatalogSchema = z.object({
  summary: z.object({
    version: z.string(),
    active_items: z.number().int().nonnegative(),
    ready_tasks: z.number().int().nonnegative(),
    total_tasks: z.number().int().nonnegative(),
    publication_state: z.string(),
  }),
  tasks: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      version: z.string(),
      active_items: z.number().int().nonnegative(),
      expected_items: z.number().int().positive(),
      delivery: z.string(),
      status: learningContentStatusSchema,
      source_file: z.string(),
    }),
  ),
  governance: learningContentGovernanceSchema,
  generated_at: z.string(),
});

const systemAdminLessonCatalogSchema = z.object({
  summary: z.object({
    version: z.string(),
    active_items: z.number().int().nonnegative(),
    ready_lessons: z.number().int().nonnegative(),
    total_lessons: z.number().int().nonnegative(),
    publication_state: z.string(),
  }),
  lessons: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      version: z.string(),
      active_items: z.number().int().nonnegative(),
      minimum_active_items: z.number().int().positive(),
      session_items: z.number().int().positive(),
      missions: z.number().int().positive(),
      selection: z.string(),
      status: learningContentStatusSchema,
      source_file: z.string(),
    }),
  ),
  governance: learningContentGovernanceSchema,
  generated_at: z.string(),
});

const scoreBandSchema = z.object({
  minimum: z.number().int().nonnegative(),
  maximum: z.number().int().nonnegative(),
  label: z.string(),
});

const systemAdminLearningRulesSchema = z.object({
  part_one: z.object({
    maximum_score: z.number().int().positive(),
    bands: z.array(scoreBandSchema),
  }),
  final_reading: z.object({
    comprehension_weight_percent: z.number().int().nonnegative(),
    reading_accuracy_weight_percent: z.number().int().nonnegative(),
    bands: z.array(scoreBandSchema),
  }),
  delivery_guards: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
  governance: learningContentGovernanceSchema,
  generated_at: z.string(),
});

const systemAdminAgentSettingsSchema = z.object({
  agent: z.object({
    name: z.string(),
    role: z.string(),
    display: z.object({
      mode: z.string(),
      fallback: z.string(),
      ownership: z.string(),
    }),
    typography: z.object({
      learner_interface: z.string(),
      authored_reading_content: z.string(),
      ownership: z.string(),
    }),
    voice: z.object({
      stable_key: z.string().nullable(),
      engine: z.string().nullable(),
      reference_set: z.string().nullable(),
      conditioning_version: z.string().nullable(),
      status: z.string(),
      published_lines: z.number().int().nonnegative(),
      reference_roles: z.array(
        z.object({
          role: z.string(),
          published_lines: z.number().int().nonnegative(),
        }),
      ),
    }),
    speech_processing: z.object({
      mu_default_mode: z.literal("raw_first"),
      conditional_mu_noise_reduction_enabled: z.boolean(),
      nu_noise_reduction: z.literal(false),
    }),
    lightweight_mode: z.object({
      enabled: z.boolean(),
      static_clara: z.boolean(),
      published_speech_only: z.boolean(),
      display_mode: z.enum(["live2d", "static"]),
      speech_mode: z.enum(["hybrid", "published_only"]),
      revision: z.string(),
      applies_on_next_learner_load: z.literal(true),
    }),
  }),
  governance: learningContentGovernanceSchema.extend({
    lightweight_mode_mutable: z.literal(true),
  }),
  generated_at: z.string(),
});

const systemAdminPromptTemplatesSchema = z.object({
  summary: z.object({
    published_voice: z.string().nullable(),
    published_templates: z.number().int().nonnegative(),
    groups: z.array(
      z.object({
        group: z.string(),
        published_templates: z.number().int().nonnegative(),
      }),
    ),
    generative_prompt_registry_configured: z.boolean(),
  }),
  templates: z.array(
    z.object({
      speech_key: z.string(),
      text: z.string(),
      reference_role: z.string(),
      group: z.string(),
      status: z.string(),
    }),
  ),
  governance: learningContentGovernanceSchema,
  generated_at: z.string(),
});

const systemAdminAuditLogDirectorySchema = z.object({
  summary: z.object({
    total_events: z.number().int().nonnegative(),
    events_last_24_hours: z.number().int().nonnegative(),
    visible_events: z.number().int().nonnegative(),
    unique_actors: z.number().int().nonnegative(),
    retention_note: z.string(),
  }),
  logs: z.array(
    z.object({
      id: z.number().int().positive(),
      action_key: z.string(),
      description: z.string(),
      actor: z.string(),
      actor_role: z.string().nullable(),
      occurred_at: z.string().nullable(),
    }),
  ),
  generated_at: z.string(),
});

const systemAdminGamesAndPlayersSchema = z.object({
  summary: z.object({
    catalog_games: z.number().int().nonnegative(),
    active_games: z.number().int().nonnegative(),
    player_profiles: z.number().int().nonnegative(),
    active_player_profiles: z.number().int().nonnegative(),
    players_with_saves: z.number().int().nonnegative(),
    save_slots: z.number().int().nonnegative(),
  }),
  games: z.array(
    z.object({
      id: z.number().int().positive(),
      game_key: z.string(),
      display_title: z.string(),
      slot: z.string(),
      engine: z.string(),
      contract_version: z.number().int().positive(),
      ruleset_version: z.string(),
      has_meaningful_progression: z.boolean(),
      is_active: z.boolean(),
      player_count: z.number().int().nonnegative(),
      save_count: z.number().int().nonnegative(),
    }),
  ),
  players: z.array(
    z.object({
      id: z.number().int().positive(),
      handle: z.string(),
      is_active: z.boolean(),
      username_changed_at: z.string().nullable(),
      learner: z.object({
        id: z.number().int().positive(),
        learner_code: z.string(),
        full_name: z.string(),
        school_name: z.string().nullable(),
        is_active: z.boolean(),
      }),
      saves: z.array(
        z.object({
          game_key: z.string(),
          game_title: z.string(),
          checkpoint_key: z.string(),
          save_schema_version: z.number().int().positive(),
          revision: z.number().int().positive(),
          saved_at: z.string().nullable(),
        }),
      ),
    }),
  ),
  governance: learningContentGovernanceSchema,
  generated_at: z.string(),
});

const apiErrorSchema = z.object({
  message: z.string().optional(),
  errors: z
    .object({
      identifier: z.array(z.string()).optional(),
      email: z.array(z.string()).optional(),
      current_password: z.array(z.string()).optional(),
      code: z.array(z.string()).optional(),
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

export type StaffSession = z.input<typeof staffSessionSchema>;
export type StaffRole = StaffSession["staff"]["role"];
export type SchoolAdminOverview = z.infer<typeof schoolAdminOverviewSchema>;
export type TeacherOverview = z.infer<typeof teacherOverviewSchema>;
export type SystemAdminOverview = z.infer<typeof systemAdminOverviewSchema>;
export type SystemAdminSchoolDirectory = z.infer<
  typeof systemAdminSchoolDirectorySchema
>;
export type SystemAdminTeacherDirectory = z.infer<
  typeof systemAdminTeacherDirectorySchema
>;
export type SystemAdminLearnerDirectory = z.infer<
  typeof systemAdminLearnerDirectorySchema
>;
export type SystemAdminAssessmentCatalog = z.infer<
  typeof systemAdminAssessmentCatalogSchema
>;
export type SystemAdminLessonCatalog = z.infer<
  typeof systemAdminLessonCatalogSchema
>;
export type SystemAdminLearningRules = z.infer<
  typeof systemAdminLearningRulesSchema
>;
export type SystemAdminAgentSettings = z.infer<
  typeof systemAdminAgentSettingsSchema
>;
export type SystemAdminLightweightMode =
  SystemAdminAgentSettings["agent"]["lightweight_mode"];
export type SystemAdminPromptTemplates = z.infer<
  typeof systemAdminPromptTemplatesSchema
>;
export type SystemAdminAuditLogDirectory = z.infer<
  typeof systemAdminAuditLogDirectorySchema
>;
export type SystemAdminGamesAndPlayers = z.infer<
  typeof systemAdminGamesAndPlayersSchema
>;

const portalTargetKeySchema = z.enum([
  "learner-dashboard",
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
  "lesson-2-mission-1",
  "lesson-2-mission-2",
  "lesson-2-complete",
  "lesson-3-mission-1",
  "lesson-3-complete",
  "lesson-4-mission-1",
  "lesson-4-complete",
  "lesson-5-mission-1",
  "lesson-5-review",
  "lesson-5-complete",
  "lesson-6-mission-1",
  "lesson-6-targeted-clue",
  "lesson-6-guided",
  "lesson-6-demonstration",
  "lesson-6-complete",
  "final-assessment-orientation",
  "final-assessment-task-1a",
  "final-assessment-task-2a",
  "final-assessment-task-2b",
  "final-assessment-part-1-results",
  "final-assessment-story-selection",
  "final-assessment-task-3a",
  "final-assessment-task-3b",
  "final-assessment-part-2-results",
  "final-assessment-complete",
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
    speech_language: learnerSpeechLanguageSchema.default("en"),
    is_active: z.boolean(),
    analytics_excluded: z.literal(true),
    progress_stage: z.string(),
    reading_path: learnerReadingPathSchema,
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
  reading_path: learnerReadingPathSchema,
  learner: z.object({
    id: z.number().int().positive(),
    learner_code: z.literal("KW000"),
    full_name: z.string(),
    first_name: z.string(),
    account_purpose: z.literal("portal_system"),
    speech_language: learnerSpeechLanguageSchema.default("en"),
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
const staffDeviceStorageKey = "readirect.staff-device";
const browserSessionToken = "cookie-session";
/**
 * Page Portal reads and launches can wake the production API and prepare a
 * complete persisted learner checkpoint. Give those operations a longer,
 * explicit budget without slowing ordinary staff requests or speech pages.
 */
export const PAGE_PORTAL_API_TIMEOUT_MS = 60_000;
export const staffSessionChangedEvent = "readirect:staff-session-changed";
const browserSessionMarker = "readirect_staff_signed_in";

const storedStaffSessionSchema = staffIdentitySessionSchema.extend({
  token: z.string().min(1),
});

function setBrowserSessionMarker(signedIn: boolean): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = signedIn
    ? `${browserSessionMarker}=1; Path=/; SameSite=Lax${secure}`
    : `${browserSessionMarker}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

export function hydrateStaffSession(): void {
  if (!isNativeSecureSessionAvailable()) return;
  const cached = getNativeSessionCache(staffSessionStorageKey);
  if (cached === undefined) return;
  try {
    if (!staffSessionSchema.safeParse(JSON.parse(cached ?? "null")).success) {
      setNativeSessionCache(staffSessionStorageKey, null);
    }
  } catch {
    setNativeSessionCache(staffSessionStorageKey, null);
  }
}

function announceStaffSessionChange(): void {
  window.dispatchEvent(new Event(staffSessionChangedEvent));
}

export async function saveStaffSession(session: StaffSession): Promise<void> {
  if (isNativeSecureSessionAvailable()) {
    const serialized = JSON.stringify(session);
    setNativeSessionCache(staffSessionStorageKey, serialized);
    try {
      if (session.session.remembered) {
        await persistNativeSession(staffSessionStorageKey, serialized);
      }
    } catch (error) {
      setNativeSessionCache(staffSessionStorageKey, null);
      throw error;
    }
    announceStaffSessionChange();
    return;
  }

  const browserSession = { ...session, token: browserSessionToken };

  const storage = session.session.remembered
    ? window.localStorage
    : window.sessionStorage;
  const otherStorage = session.session.remembered
    ? window.sessionStorage
    : window.localStorage;
  otherStorage.removeItem(staffSessionStorageKey);
  storage.setItem(staffSessionStorageKey, JSON.stringify(browserSession));
  setBrowserSessionMarker(true);
  announceStaffSessionChange();
}

export async function restoreStaffSession(): Promise<StaffSession | null> {
  const response = await fetch("/api/staff/session", {
    headers: {
      Accept: "application/json",
      ...(loadStaffSession()?.session.remembered
        ? { "X-ReaDirect-Device": getStaffDeviceId() }
        : {}),
    },
  });
  if (!response.ok) return null;
  const identity = staffIdentitySessionSchema.parse(
    await readApiJson(response),
  );
  return { ...identity, token: browserSessionToken };
}

export function loadStaffSession(): StaffSession | null {
  if (isNativeSecureSessionAvailable()) {
    const cached = getNativeSessionCache(staffSessionStorageKey);
    if (!cached) return null;
    const parsed = staffSessionSchema.safeParse(JSON.parse(cached));
    return parsed.success ? parsed.data : null;
  }

  const storage = window.sessionStorage.getItem(staffSessionStorageKey)
    ? window.sessionStorage
    : window.localStorage;
  const storedSession = storage.getItem(staffSessionStorageKey);

  if (!storedSession) {
    return null;
  }

  let storedValue: unknown;

  try {
    storedValue = JSON.parse(storedSession);
  } catch {
    storage.removeItem(staffSessionStorageKey);
    return null;
  }

  const parsed = storedStaffSessionSchema.safeParse(storedValue);

  if (!parsed.success) {
    storage.removeItem(staffSessionStorageKey);
    return null;
  }

  if (parsed.data.token === browserSessionToken) return parsed.data;
  storage.removeItem(staffSessionStorageKey);
  return null;
}

export function clearStaffSession(): void {
  const session = loadStaffSession();
  if (isNativeSecureSessionAvailable()) {
    setNativeSessionCache(staffSessionStorageKey, null);
    void removeNativeSession(staffSessionStorageKey);
  } else {
    window.sessionStorage.removeItem(staffSessionStorageKey);
    window.localStorage.removeItem(staffSessionStorageKey);
    setBrowserSessionMarker(false);
  }
  announceStaffSessionChange();

  if (session) {
    void fetch("/api/staff/logout", {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...getStaffAuthHeaders(session),
      },
      keepalive: true,
    }).catch(() => undefined);
  }
}

function discardStaffSession(): void {
  if (isNativeSecureSessionAvailable()) {
    setNativeSessionCache(staffSessionStorageKey, null);
    void removeNativeSession(staffSessionStorageKey);
  } else {
    window.sessionStorage.removeItem(staffSessionStorageKey);
    window.localStorage.removeItem(staffSessionStorageKey);
    setBrowserSessionMarker(false);
  }
  announceStaffSessionChange();
}

export async function staffFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs?: number,
): Promise<Response> {
  const session = loadStaffSession();
  const headers = new Headers(init.headers);

  if (session) {
    for (const [name, value] of Object.entries(getStaffAuthHeaders(session))) {
      headers.set(name, value);
    }
  }

  const response =
    timeoutMs === undefined
      ? await fetch(input, { ...init, headers })
      : await apiFetchWithTimeout(input, { ...init, headers }, timeoutMs);

  if (response.status === 401) {
    discardStaffSession();
  }

  return response;
}

export async function getCurrentStaffSession(): Promise<StaffSession> {
  const currentSession = loadStaffSession();

  if (!currentSession) {
    throw new Error("Staff session is required.");
  }

  const response = await staffFetch("/api/staff/session", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const identity = staffIdentitySessionSchema.parse(
    await readApiJson(response),
  );
  const refreshedSession = storedStaffSessionSchema.parse({
    ...identity,
    token: currentSession.token,
  });
  await saveStaffSession(refreshedSession);

  return refreshedSession;
}

async function readApiError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);

  if (!parsed.success) {
    return "ReaDirect could not complete that request.";
  }

  return (
    parsed.data.errors?.identifier?.[0] ??
    parsed.data.errors?.email?.[0] ??
    parsed.data.errors?.current_password?.[0] ??
    parsed.data.errors?.code?.[0] ??
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

const verificationSentSchema = z.object({
  verification_sent: z.literal(true),
  expires_in_seconds: z.number().int().positive(),
});

const verifiedEmailSchema = z.object({
  email: z.string().email(),
  email_verified_at: z.string(),
});

export async function requestStaffEmailVerification(input: {
  email: string;
  current_password: string;
}): Promise<z.infer<typeof verificationSentSchema>> {
  const response = await staffFetch("/api/staff/security/email-verification", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw new Error(await readApiError(response));
  return verificationSentSchema.parse(await response.json());
}

export async function confirmStaffEmailVerification(
  code: string,
): Promise<z.infer<typeof verifiedEmailSchema>> {
  const response = await staffFetch(
    "/api/staff/security/email-verification/confirm",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    },
  );

  if (!response.ok) throw new Error(await readApiError(response));
  return verifiedEmailSchema.parse(await response.json());
}

export async function requestStaffPasswordChangeCode(
  currentPassword: string,
): Promise<z.infer<typeof verificationSentSchema>> {
  const response = await staffFetch(
    "/api/staff/security/password-change-code",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ current_password: currentPassword }),
    },
  );

  if (!response.ok) throw new Error(await readApiError(response));
  return verificationSentSchema.parse(await response.json());
}

export async function changeStaffPassword(input: {
  current_password: string;
  code: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  const response = await staffFetch("/api/staff/security/password", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw new Error(await readApiError(response));
  z.object({ password_changed: z.literal(true) }).parse(await response.json());
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
  const response = await staffFetch(
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
  const response = await staffFetch(
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
  const response = await staffFetch(
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
  const response = await staffFetch(
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

const resetLearnerCredentialsSchema = z.object({
  id: z.number().int().positive(),
  learner_code: z.string().regex(/^[A-Z]{2}\d{3}$/),
  full_name: z.string(),
  temporary_password: z.string().regex(/^(apple|orange|lemon)\d{3}$/),
});

const resetLearnerPasswordResponseSchema = z.object({
  learner: resetLearnerCredentialsSchema,
});

const importedLearnersResponseSchema = z.object({
  learners: z.array(resetLearnerCredentialsSchema).min(1).max(100),
});

export type LearnerAccount = z.infer<typeof learnerAccountSchema>;
export type CreatedLearnerAccount = z.infer<typeof createdLearnerSchema>;
export type ResetLearnerCredentials = z.infer<
  typeof resetLearnerCredentialsSchema
>;
export interface LearnerImportRow {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  lrn: string;
}

export async function getTeacherLearners(
  staffUserId: number,
): Promise<LearnerAccount[]> {
  const response = await staffFetch(
    `/api/staff/teacher/${staffUserId}/learners`,
    {
      headers: { Accept: "application/json" },
    },
  );

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
  const response = await staffFetch(
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

export async function resetLearnerPassword(input: {
  staffUserId: number;
  learnerId: number;
}): Promise<ResetLearnerCredentials> {
  const response = await staffFetch(
    `/api/staff/teacher/${input.staffUserId}/learners/${input.learnerId}/reset-password`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return resetLearnerPasswordResponseSchema.parse(await response.json())
    .learner;
}

export async function importTeacherLearners(input: {
  staffUserId: number;
  learners: LearnerImportRow[];
}): Promise<ResetLearnerCredentials[]> {
  const response = await staffFetch(
    `/api/staff/teacher/${input.staffUserId}/learners/import`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ learners: input.learners }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return importedLearnersResponseSchema.parse(await response.json()).learners;
}

export async function issueTeacherCredentialSheet(input: {
  staffUserId: number;
  learnerIds: number[];
}): Promise<ResetLearnerCredentials[]> {
  const response = await staffFetch(
    `/api/staff/teacher/${input.staffUserId}/learners/credential-sheet`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ learner_ids: input.learnerIds }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return importedLearnersResponseSchema.parse(await response.json()).learners;
}

export async function loginStaff(credentials: {
  identifier: string;
  password: string;
  remember_me: boolean;
}): Promise<StaffSession> {
  const payload = credentials.remember_me
    ? { ...credentials, device_id: getStaffDeviceId() }
    : credentials;
  const response = await fetch("/api/staff/login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return staffSessionSchema.parse(await readApiJson(response));
}

function getStaffDeviceId(): string {
  const existing = window.localStorage.getItem(staffDeviceStorageKey);
  if (existing && /^[A-Za-z0-9_-]{1,64}$/.test(existing)) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(staffDeviceStorageKey, created);
  return created;
}

export function getStaffAuthHeaders(
  session: StaffSession,
): Record<string, string> {
  return {
    Authorization: `Bearer ${session.token}`,
    ...(session.session.remembered
      ? { "X-ReaDirect-Device": getStaffDeviceId() }
      : {}),
  };
}

export async function getSystemAdminOverview(): Promise<SystemAdminOverview> {
  const response = await staffFetch("/api/staff/system-admin/overview", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminOverviewSchema.parse(await response.json());
}

export async function getSystemAdminSchools(): Promise<SystemAdminSchoolDirectory> {
  const response = await staffFetch("/api/staff/system-admin/schools", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminSchoolDirectorySchema.parse(await response.json());
}

export async function getSystemAdminTeachers(): Promise<SystemAdminTeacherDirectory> {
  const response = await staffFetch("/api/staff/system-admin/teachers", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminTeacherDirectorySchema.parse(await response.json());
}

export async function getSystemAdminLearners(): Promise<SystemAdminLearnerDirectory> {
  const response = await staffFetch("/api/staff/system-admin/learners", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminLearnerDirectorySchema.parse(await response.json());
}

export async function getSystemAdminAssessmentCatalog(): Promise<SystemAdminAssessmentCatalog> {
  const response = await staffFetch(
    "/api/staff/system-admin/learning-content/assessments",
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminAssessmentCatalogSchema.parse(await response.json());
}

export async function getSystemAdminLessonCatalog(): Promise<SystemAdminLessonCatalog> {
  const response = await staffFetch(
    "/api/staff/system-admin/learning-content/lessons",
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminLessonCatalogSchema.parse(await response.json());
}

export async function getSystemAdminLearningRules(): Promise<SystemAdminLearningRules> {
  const response = await staffFetch(
    "/api/staff/system-admin/learning-content/rules",
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminLearningRulesSchema.parse(await response.json());
}

export async function getSystemAdminAgentSettings(): Promise<SystemAdminAgentSettings> {
  const response = await staffFetch(
    "/api/staff/system-admin/agents-ai/settings",
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminAgentSettingsSchema.parse(await response.json());
}

const lightweightModeResponseSchema = z.object({
  lightweight_mode:
    systemAdminAgentSettingsSchema.shape.agent.shape.lightweight_mode,
});

export async function updateSystemAdminLightweightMode(input: {
  enabled: boolean;
  static_clara: boolean;
  published_speech_only: boolean;
}): Promise<SystemAdminLightweightMode> {
  const response = await staffFetch(
    "/api/staff/system-admin/agents-ai/lightweight-mode",
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return lightweightModeResponseSchema.parse(await response.json())
    .lightweight_mode;
}

export async function getSystemAdminPromptTemplates(): Promise<SystemAdminPromptTemplates> {
  const response = await staffFetch(
    "/api/staff/system-admin/agents-ai/prompt-templates",
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminPromptTemplatesSchema.parse(await response.json());
}

export async function getSystemAdminAuditLogs(): Promise<SystemAdminAuditLogDirectory> {
  const response = await staffFetch(
    "/api/staff/system-admin/operations/audit-logs",
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminAuditLogDirectorySchema.parse(await response.json());
}

export async function getSystemAdminGamesAndPlayers(): Promise<SystemAdminGamesAndPlayers> {
  const response = await staffFetch(
    "/api/staff/system-admin/operations/games-and-players",
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return systemAdminGamesAndPlayersSchema.parse(await response.json());
}

const speechProcessingResponseSchema = z.object({
  speech_processing: systemAdminOverviewSchema.shape.speech_processing,
});

export async function updateConditionalMuNoiseReduction(
  staffUserId: number,
  enabled: boolean,
): Promise<SystemAdminOverview["speech_processing"]> {
  const response = await staffFetch(
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
  const response = await staffFetch(
    `/api/staff/system-admin/${staffUserId}/page-portals`,
    { headers: { Accept: "application/json" } },
    PAGE_PORTAL_API_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return portalSystemLearnerSchema.parse(await response.json());
}

export async function resetPortalSystemLearner(
  staffUserId: number,
): Promise<PortalSystemLearner> {
  const response = await staffFetch(
    `/api/staff/system-admin/${staffUserId}/page-portals/reset-kristen`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
    PAGE_PORTAL_API_TIMEOUT_MS,
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
  const response = await staffFetch(
    `/api/staff/system-admin/${staffUserId}/page-portals/launch`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target_key: targetKey }),
    },
    PAGE_PORTAL_API_TIMEOUT_MS,
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
  const response = await staffFetch(
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

  const currentSession = loadStaffSession();
  if (!currentSession) {
    throw new Error("Your staff session has expired.");
  }

  const updatedAccount = staffAccountResponseSchema.parse(
    await response.json(),
  );

  return storedStaffSessionSchema.parse({
    ...currentSession,
    staff: updatedAccount.staff,
  });
}

export async function getSchoolAdminOverview(
  staffUserId: number,
): Promise<SchoolAdminOverview> {
  const response = await staffFetch(
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
  const response = await staffFetch(
    `/api/staff/teacher/${staffUserId}/overview`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return teacherOverviewSchema.parse(await response.json());
}

export async function acknowledgeTeacherAssignment(
  staffUserId: number,
): Promise<z.infer<typeof teacherAssignmentAcknowledgementSchema>> {
  const response = await staffFetch(
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
