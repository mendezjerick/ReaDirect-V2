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
    items: [{ label: "Overview", to: "/staff/system-admin" }],
  },
  {
    label: "People and schools",
    items: [
      { label: "Schools" },
      {
        label: "School administrators",
        to: "/staff/system-admin/school-administrators",
      },
      { label: "Teachers" },
      { label: "Learners" },
      { label: "Guests" },
    ],
  },
  {
    label: "Learning content",
    items: [
      { label: "Assessments" },
      { label: "Lessons" },
      { label: "Rules and thresholds" },
    ],
  },
  {
    label: "Agents and AI",
    items: [
      { label: "AI services" },
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
      { label: "Agent settings" },
      { label: "Prompt templates" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Audit logs" },
      { label: "System monitoring" },
      { label: "Page portals", to: "/staff/system-admin/page-portals" },
      { label: "Speech tools" },
      { label: "Games and players" },
    ],
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
];
