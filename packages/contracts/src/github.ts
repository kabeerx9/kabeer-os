import { z } from "zod";

import { recommendedActionSchema, workItemSchema } from "./morning-brief";

export const githubSyncInputSchema = z
  .object({
    lookbackHours: z.number().int().min(1).max(168).default(24),
    since: z.iso.datetime().optional(),
  })
  .strict();

export const githubActivityTypeSchema = z.enum([
  "push",
  "pull_request",
  "issue",
  "issue_comment",
  "pull_request_review",
  "pull_request_review_comment",
  "commit_comment",
  "create",
  "delete",
  "release",
  "unknown",
]);

export const githubActivitySchema = z
  .object({
    id: z.string().min(1),
    type: githubActivityTypeSchema,
    action: z.string().min(1),
    repo: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    url: z.url().optional(),
    createdAt: z.iso.datetime(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export const githubSyncResultSchema = z
  .object({
    syncedAt: z.iso.datetime(),
    since: z.iso.datetime(),
    username: z.string().min(1),
    activities: z.array(githubActivitySchema),
    workItems: z.array(workItemSchema),
    recommendedActions: z.array(recommendedActionSchema),
  })
  .strict();

export type GitHubSyncInput = z.infer<typeof githubSyncInputSchema>;
export type GitHubActivityType = z.infer<typeof githubActivityTypeSchema>;
export type GitHubActivity = z.infer<typeof githubActivitySchema>;
export type GitHubSyncResult = z.infer<typeof githubSyncResultSchema>;
