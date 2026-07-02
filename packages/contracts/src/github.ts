import { z } from "zod";

import { recommendedActionSchema, workItemSchema } from "./morning-brief";

export const githubSyncInputSchema = z
  .object({
    lookbackHours: z.number().int().min(1).max(168).default(24),
    since: z.iso.datetime().optional(),
  })
  .strict();

export const githubRepositoryNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+$/);

const githubAssigneeSchema = z
  .string()
  .regex(/^(?:me|[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)$/);

export const githubAttentionInputSchema = z
  .object({
    repositories: z.array(githubRepositoryNameSchema).max(50).default([]),
  })
  .strict();

export const githubRepositorySearchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(120),
    limit: z.number().int().min(1).max(20).default(10),
  })
  .strict();

export const githubRepositorySchema = z
  .object({
    name: githubRepositoryNameSchema,
    description: z.string().nullable().optional(),
    url: z.url(),
    private: z.boolean(),
    updatedAt: z.iso.datetime().optional(),
  })
  .strict();

export const githubRepositorySearchResultSchema = z
  .object({
    searchedAt: z.iso.datetime(),
    query: z.string().min(1),
    repositories: z.array(githubRepositorySchema),
  })
  .strict();

export const githubIssueSearchInputSchema = z
  .object({
    repository: githubRepositoryNameSchema,
    assignee: githubAssigneeSchema.default("me"),
    state: z.enum(["open", "closed", "all"]).default("open"),
    query: z.string().trim().min(1).max(120).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .strict();

export const githubIssueSearchItemSchema = z
  .object({
    id: z.string().min(1),
    repo: githubRepositoryNameSchema,
    number: z.number().int().min(1),
    title: z.string().min(1),
    state: z.enum(["open", "closed"]),
    url: z.url(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    author: z.string().min(1).optional(),
    labels: z.array(z.string().min(1)),
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export const githubIssueSearchResultSchema = z
  .object({
    searchedAt: z.iso.datetime(),
    repository: githubRepositoryNameSchema,
    issues: z.array(githubIssueSearchItemSchema),
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

export const githubDailySummaryInputSchema = z
  .object({
    sync: githubSyncResultSchema.nullable().default(null),
    newActivityIds: z.array(z.string().min(1)).default([]),
    attention: githubAttentionResultSchema.nullable().default(null),
  })
  .strict();

export const githubDailySummaryCountsSchema = z
  .object({
    activities: z.number().int().min(0),
    newActivities: z.number().int().min(0),
    pushes: z.number().int().min(0),
    commits: z.number().int().min(0),
    pullRequests: z.number().int().min(0),
    issues: z.number().int().min(0),
    comments: z.number().int().min(0),
    reviews: z.number().int().min(0),
    releases: z.number().int().min(0),
    branchChanges: z.number().int().min(0),
    other: z.number().int().min(0),
  })
  .strict();

export const githubDailySummaryProjectSchema = z
  .object({
    repo: githubRepositoryNameSchema,
    latestAt: z.iso.datetime(),
    summary: z.string().min(1),
    highlights: z.array(z.string().min(1)),
    counts: githubDailySummaryCountsSchema,
  })
  .strict();

export const githubDailySummaryAttentionSchema = z
  .object({
    summary: z.string().min(1),
    total: z.number().int().min(0),
    reviewRequests: z.number().int().min(0),
    assigned: z.number().int().min(0),
    mentions: z.number().int().min(0),
    failedWorkflows: z.number().int().min(0),
  })
  .strict();

export const githubDailySummaryResultSchema = z
  .object({
    generatedAt: z.iso.datetime(),
    window: z
      .object({
        since: z.iso.datetime(),
        syncedAt: z.iso.datetime(),
      })
      .strict()
      .nullable(),
    headline: z.string().min(1),
    summary: z.string().min(1),
    bullets: z.array(z.string().min(1)),
    projects: z.array(githubDailySummaryProjectSchema),
    attention: githubDailySummaryAttentionSchema,
    empty: z.boolean(),
  })
  .strict();

export type GitHubSyncInput = z.infer<typeof githubSyncInputSchema>;
export type GitHubAttentionInput = z.infer<typeof githubAttentionInputSchema>;
export type GitHubRepositorySearchInput = z.infer<typeof githubRepositorySearchInputSchema>;
export type GitHubRepository = z.infer<typeof githubRepositorySchema>;
export type GitHubRepositorySearchResult = z.infer<typeof githubRepositorySearchResultSchema>;
export type GitHubIssueSearchInput = z.infer<typeof githubIssueSearchInputSchema>;
export type GitHubIssueSearchItem = z.infer<typeof githubIssueSearchItemSchema>;
export type GitHubIssueSearchResult = z.infer<typeof githubIssueSearchResultSchema>;
export type GitHubDailySummaryInput = z.infer<typeof githubDailySummaryInputSchema>;
export type GitHubDailySummaryCounts = z.infer<typeof githubDailySummaryCountsSchema>;
export type GitHubDailySummaryProject = z.infer<typeof githubDailySummaryProjectSchema>;
export type GitHubDailySummaryAttention = z.infer<typeof githubDailySummaryAttentionSchema>;
export type GitHubDailySummaryResult = z.infer<typeof githubDailySummaryResultSchema>;
export type GitHubActivityType = z.infer<typeof githubActivityTypeSchema>;
export type GitHubActivity = z.infer<typeof githubActivitySchema>;
export type GitHubSyncResult = z.infer<typeof githubSyncResultSchema>;
export type GitHubSyncStoreState = z.infer<typeof githubSyncStoreStateSchema>;
export type GitHubSyncSnapshot = z.infer<typeof githubSyncSnapshotSchema>;
export type GitHubAttentionItemKind = z.infer<typeof githubAttentionItemKindSchema>;
export type GitHubAttentionItem = z.infer<typeof githubAttentionItemSchema>;
export type GitHubAttentionResult = z.infer<typeof githubAttentionResultSchema>;
