import { z } from "zod";

import generatedContent from "./offlineJourneyContent.generated.json";

const choiceSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

const baseItemSchema = z.object({
  key: z.string().min(1),
  phase: z.string().min(1),
  prompt: z.string().min(1),
  display: z.string().min(1),
  ttsKey: z.string().regex(/^[A-Za-z0-9-]+$/),
});

const activityItemSchema = z.discriminatedUnion("kind", [
  baseItemSchema.extend({
    kind: z.literal("speech"),
    expected: z.string().min(1),
    long: z.boolean(),
  }),
  baseItemSchema.extend({
    kind: z.literal("choice"),
    choices: z.array(choiceSchema).min(2).max(4),
    correctChoice: z.string().min(1),
  }),
]);

const activitySchema = z.object({
  key: z.string().min(1).optional(),
  order: z.number().int().min(1).max(6).optional(),
  title: z.string().min(1),
  completionTtsKey: z.string().regex(/^[A-Za-z0-9-]+$/),
  items: z.array(activityItemSchema).min(1),
});

const contentSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.literal("v1"),
  assessments: z.object({
    diagnostic: activitySchema,
    final: activitySchema,
  }),
  lessons: z.array(activitySchema).length(6),
});

export const offlineJourneyContent = contentSchema.parse(generatedContent);
export type OfflineJourneyActivity = z.infer<typeof activitySchema>;
export type OfflineJourneyItem = z.infer<typeof activityItemSchema>;
