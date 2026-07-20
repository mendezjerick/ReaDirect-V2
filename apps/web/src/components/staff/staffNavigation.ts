export interface StaffNavigationItem {
  label: string;
  to?: string;
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
      { label: "School profile" },
      { label: "Teachers", to: "/staff/school-admin/teachers" },
      { label: "Classes" },
      { label: "Learners" },
    ],
  },
  {
    label: "Review and reporting",
    items: [{ label: "Reports" }, { label: "Teacher dashboards" }],
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
      { label: "Learners", to: "/staff/teacher/learners" },
      { label: "Import learners" },
      { label: "Credential sheets" },
    ],
  },
  {
    label: "Assessment review",
    items: [
      { label: "Diagnostic Assessment" },
      { label: "Final Assessment" },
      { label: "Reports" },
      { label: "Analytics" },
    ],
  },
  {
    label: "Learning content",
    items: [{ label: "Optional lessons" }],
  },
];
