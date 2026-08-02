export interface StaffNavigationItem {
  label: string;
  to?: string;
  end?: boolean;
}

export interface StaffNavigationGroup {
  label: string;
  items: StaffNavigationItem[];
}

export const systemAdminNavigationGroups: StaffNavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", to: "/staff/system-admin" },
      { label: "Demos", to: "/staff/system-admin/demos" },
    ],
  },
  {
    label: "People and schools",
    items: [
      { label: "Schools", to: "/staff/system-admin/schools" },
      {
        label: "School administrators",
        to: "/staff/system-admin/school-administrators",
      },
      { label: "Teachers", to: "/staff/system-admin/teachers" },
      { label: "Learners", to: "/staff/system-admin/learners" },
      { label: "Guests", to: "/staff/system-admin/guests" },
    ],
  },
  {
    label: "Learning content",
    items: [
      { label: "Assessments", to: "/staff/system-admin/assessments" },
      { label: "Lessons", to: "/staff/system-admin/lessons" },
      {
        label: "Rules and thresholds",
        to: "/staff/system-admin/rules-and-thresholds",
      },
    ],
  },
  {
    label: "Agents and AI",
    items: [
      { label: "AI services", to: "/staff/system-admin/ai-services" },
      {
        label: "IsoLetter Sandbox",
        to: "/staff/system-admin/isoletter-sandbox",
      },
      { label: "True Sandbox", to: "/staff/system-admin/true-sandbox" },
      {
        label: "Equivalence Book",
        to: "/staff/system-admin/equivalence-book",
      },
      {
        label: "Confusion Matrix",
        to: "/staff/system-admin/confusion-matrix",
      },
      { label: "Agent settings", to: "/staff/system-admin/agent-settings" },
      {
        label: "Prompt templates",
        to: "/staff/system-admin/prompt-templates",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Audit logs", to: "/staff/system-admin/audit-logs" },
      {
        label: "System monitoring",
        to: "/staff/system-admin/system-monitoring",
      },
      { label: "Page portals", to: "/staff/system-admin/page-portals" },
      { label: "Speech tools", to: "/staff/system-admin/speech-tools" },
      {
        label: "Games and players",
        to: "/staff/system-admin/games-and-players",
      },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Account security", to: "/staff/security" }],
  },
];

export const schoolAdminNavigationGroups: StaffNavigationGroup[] = [
  {
    label: "Workspace",
    items: [{ label: "Overview", to: "/staff/school-admin" }],
  },
  {
    label: "School management",
    items: [
      { label: "School profile", to: "/staff/school-admin/profile" },
      { label: "Teachers", to: "/staff/school-admin/teachers" },
      { label: "Classes", to: "/staff/school-admin/classes" },
      {
        label: "Learners",
        to: "/staff/school-admin/learners",
        end: false,
      },
    ],
  },
  {
    label: "Review and reporting",
    items: [
      {
        label: "Instructional Insights",
        to: "/staff/school-admin/instructional-insights",
      },
      { label: "Reports", to: "/staff/school-admin/reports" },
      {
        label: "Teacher dashboards",
        to: "/staff/school-admin/teacher-dashboards",
      },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Account security", to: "/staff/security" }],
  },
];

export const teacherNavigationGroups: StaffNavigationGroup[] = [
  {
    label: "Workspace",
    items: [{ label: "Overview", to: "/staff/teacher" }],
  },
  {
    label: "Class management",
    items: [
      {
        label: "Learners",
        to: "/staff/teacher/learners",
        end: false,
      },
      {
        label: "Import learners",
        to: "/staff/teacher/learners/import",
      },
      {
        label: "Credential sheets",
        to: "/staff/teacher/learners/credentials",
      },
    ],
  },
  {
    label: "Assessment review",
    items: [
      {
        label: "Diagnostic Assessment",
        to: "/staff/teacher/assessments/diagnostic",
      },
      {
        label: "Final Assessment",
        to: "/staff/teacher/assessments/final",
      },
      { label: "Reports", to: "/staff/teacher/reports" },
      { label: "Analytics", to: "/staff/teacher/analytics" },
      { label: "Audio review", to: "/staff/teacher/audio-review" },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Account security", to: "/staff/security" }],
  },
];
