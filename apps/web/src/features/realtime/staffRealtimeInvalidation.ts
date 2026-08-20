import type { QueryKey } from "@tanstack/react-query";
import { z } from "zod";

import type { StaffSession } from "../staff-auth/staffApi";

export const staffRealtimeTopicSchema = z.enum([
  "overview",
  "school-administrators",
  "schools",
  "school-profile",
  "classes",
  "teachers",
  "learners",
  "learner-detail",
  "analytics",
  "reports",
  "instructional-insights",
  "assessment-reviews",
  "operations",
]);

export type StaffRealtimeTopic = z.infer<typeof staffRealtimeTopicSchema>;

export function queryKeysForRealtimeTopics(
  staff: StaffSession["staff"],
  topics: readonly StaffRealtimeTopic[],
): QueryKey[] {
  const queryKeys: QueryKey[] = [];
  const add = (...queryKey: QueryKey) => queryKeys.push(queryKey);

  for (const topic of new Set(topics)) {
    if (staff.role === "system_admin") {
      appendSystemAdminQueryKeys(topic, add);
    } else if (staff.role === "school_admin") {
      appendSchoolAdminQueryKeys(topic, staff.id, add);
    } else {
      appendTeacherQueryKeys(topic, staff.id, add);
    }
  }

  const unique = new Map(
    queryKeys.map((queryKey) => [JSON.stringify(queryKey), queryKey]),
  );

  return [...unique.values()];
}

type AddQueryKey = (...queryKey: QueryKey) => number;

function appendSystemAdminQueryKeys(
  topic: StaffRealtimeTopic,
  add: AddQueryKey,
) {
  switch (topic) {
    case "overview":
      add("system-admin-overview");
      break;
    case "school-administrators":
      add("school-administrators");
      break;
    case "schools":
    case "school-profile":
      add("system-admin-schools");
      break;
    case "classes":
    case "teachers":
      add("system-admin-teachers");
      break;
    case "learners":
      add("system-admin-learners");
      break;
    case "learner-detail":
      add("system-admin-learners");
      add("system-admin-page-portals");
      break;
    case "operations":
      add("system-admin-operations");
      break;
  }
}

function appendSchoolAdminQueryKeys(
  topic: StaffRealtimeTopic,
  staffUserId: number,
  add: AddQueryKey,
) {
  switch (topic) {
    case "overview":
      add("school-admin-overview", staffUserId);
      break;
    case "schools":
    case "school-profile":
      add("school-admin-profile", staffUserId);
      break;
    case "classes":
      add("school-admin-classes", staffUserId);
      break;
    case "teachers":
      add("school-admin-teachers", staffUserId);
      break;
    case "learners":
      add("school-admin-learners", staffUserId);
      break;
    case "learner-detail":
      add("school-admin-learner-detail", staffUserId);
      add("school-admin-teacher-dashboard", staffUserId);
      break;
    case "reports":
      add("school-admin-report", staffUserId);
      break;
    case "instructional-insights":
      add("school-admin-instructional-insights", staffUserId);
      break;
  }
}

function appendTeacherQueryKeys(
  topic: StaffRealtimeTopic,
  staffUserId: number,
  add: AddQueryKey,
) {
  switch (topic) {
    case "overview":
      add("teacher-overview", staffUserId);
      break;
    case "learners":
      add("teacher-learners", staffUserId);
      break;
    case "learner-detail":
      add("teacher-learner-detail", staffUserId);
      break;
    case "analytics":
      add("teacher-analytics", staffUserId);
      break;
    case "reports":
      add("teacher-report", staffUserId);
      break;
    case "assessment-reviews":
      add("teacher-assessment-review");
      break;
  }
}
