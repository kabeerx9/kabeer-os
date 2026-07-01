import { z } from "zod";

import { recommendedActionSchema, workItemSchema } from "./morning-brief";

export const githubSyncInputSchema = z
  .object({
    lookbackHours: z.number().int().min(1).max(168).default(24),
    since: z.iso.datetime().optional(),
  })
  .strict();

const githubRepositoryNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+$/);

export const githubAttentionInputSchema = z
  .object({
    repositories: z.array(githubRepositoryNameSchema).max(50).default([]),
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

export const githubSyncStoreStateSchema = z
  .object({
    lastSync: githubSyncResultSchema.nullable(),
    seenActivityIds: z.array(z.string().min(1)),
    lastNewActivityIds: z.array(z.string().min(1)),
  })
  .strict();

export const githubSyncSnapshotSchema = z
  .object({
    lastSync: githubSyncResultSchema.nullable(),
    seenActivityIds: z.array(z.string().min(1)),
    newActivityIds: z.array(z.string().min(1)),
  })
  .strict();

export const githubAttentionItemKindSchema = z.enum([
  "review_request",
  "assigned",
  "mention",
  "failed_workflow",
]);

export const githubAttentionItemSchema = z
  .object({
    id: z.string().min(1),
    kind: githubAttentionItemKindSchema,
    repo: githubRepositoryNameSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    url: z.url(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime().optional(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export const githubAttentionResultSchema = z
  .object({
    syncedAt: z.iso.datetime(),
    username: z.string().min(1),
    repositories: z.array(githubRepositoryNameSchema),
    items: z.array(githubAttentionItemSchema),
  })
  .strict();

export type GitHubSyncInput = z.infer<typeof githubSyncInputSchema>;
export type GitHubAttentionInput = z.infer<typeof githubAttentionInputSchema>;
export type GitHubActivityType = z.infer<typeof githubActivityTypeSchema>;
export type GitHubActivity = z.infer<typeof githubActivitySchema>;
export type GitHubSyncResult = z.infer<typeof githubSyncResultSchema>;
export type GitHubSyncStoreState = z.infer<typeof githubSyncStoreStateSchema>;
export type GitHubSyncSnapshot = z.infer<typeof githubSyncSnapshotSchema>;
export type GitHubAttentionItemKind = z.infer<typeof githubAttentionItemKindSchema>;
export type GitHubAttentionItem = z.infer<typeof githubAttentionItemSchema>;
export type GitHubAttentionResult = z.infer<typeof githubAttentionResultSchema>;
