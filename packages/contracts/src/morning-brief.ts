import { z } from "zod";

export const workItemSourceSchema = z.enum(["github"]);

export const workItemKindSchema = z.enum([
  "review_request",
  "assigned_issue",
  "failed_workflow",
  "mention",
]);

export const workItemPrioritySchema = z.enum(["high", "medium", "low"]);

export const recommendedActionTypeSchema = z.enum([
  "open_url",
  "start_codex_task",
  "mark_seen",
]);

export const workItemSchema = z
  .object({
    id: z.string().min(1),
    source: workItemSourceSchema,
    kind: workItemKindSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    url: z.url().optional(),
    priority: workItemPrioritySchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export const recommendedActionSchema = z
  .object({
    id: z.string().min(1),
    workItemId: z.string().min(1),
    label: z.string().min(1),
    reason: z.string().min(1),
    actionType: recommendedActionTypeSchema,
  })
  .strict();

export const morningBriefSummarySchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    totalWorkItems: z.number().int().nonnegative(),
    highPriorityCount: z.number().int().nonnegative(),
  })
  .strict();

export const morningBriefSchema = z
  .object({
    generatedAt: z.iso.datetime(),
    summary: morningBriefSummarySchema,
    workItems: z.array(workItemSchema),
    recommendedActions: z.array(recommendedActionSchema),
  })
  .strict();

export type WorkItemSource = z.infer<typeof workItemSourceSchema>;
export type WorkItemKind = z.infer<typeof workItemKindSchema>;
export type WorkItemPriority = z.infer<typeof workItemPrioritySchema>;
export type RecommendedActionType = z.infer<typeof recommendedActionTypeSchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
export type RecommendedAction = z.infer<typeof recommendedActionSchema>;
export type MorningBriefSummary = z.infer<typeof morningBriefSummarySchema>;
export type MorningBrief = z.infer<typeof morningBriefSchema>;
