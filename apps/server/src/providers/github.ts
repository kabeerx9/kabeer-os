import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  githubAttentionInputSchema,
  githubAttentionResultSchema,
  githubSyncResultSchema,
  type GitHubActivity,
  type GitHubActivityType,
  type GitHubAttentionInput,
  type GitHubAttentionItem,
  type GitHubAttentionItemKind,
  type GitHubAttentionResult,
  type GitHubSyncInput,
  type GitHubSyncResult,
} from "@app-starter/contracts/github";
import type { WorkItem } from "@app-starter/contracts/morning-brief";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const hourInMs = 60 * 60 * 1000;
const attentionWorkflowLookbackMs = 7 * 24 * hourInMs;
const maxFailedWorkflowItemsPerRepo = 3;

export type GhCommandRunner = {
  run: (args: readonly string[]) => Promise<string>;
};

export type GitHubProvider = {
  syncActivity: (input: GitHubSyncInput) => Promise<GitHubSyncResult>;
  syncAttention: (input: GitHubAttentionInput) => Promise<GitHubAttentionResult>;
};

export type GitHubProviderOptions = {
  runner?: GhCommandRunner;
  now?: () => Date;
};

export class GitHubProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GitHubProviderError";
  }
}

const githubUserSchema = z.string().trim().min(1);

const githubEventSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    repo: z
      .object({
        name: z.string(),
      })
      .passthrough(),
    payload: z.record(z.string(), z.unknown()).default({}),
    created_at: z.iso.datetime(),
  })
  .passthrough();

const githubEventListSchema = z.array(githubEventSchema);

type GitHubEvent = z.infer<typeof githubEventSchema>;

type PushCommit = {
  sha?: string;
  message: string;
  url?: string;
};

const githubCompareCommitSchema = z
  .object({
    sha: z.string().optional(),
    commit: z
      .object({
        message: z.string().optional(),
      })
      .passthrough()
      .optional(),
    html_url: z.string().optional(),
  })
  .passthrough();

const githubCompareSchema = z
  .object({
    commits: z.array(githubCompareCommitSchema).default([]),
  })
  .passthrough();

const githubSearchIssueSchema = z
  .object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    html_url: z.string(),
    repository_url: z.string(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
    pull_request: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const githubSearchIssuesSchema = z
  .object({
    items: z.array(githubSearchIssueSchema).default([]),
  })
  .passthrough();

const githubWorkflowRunSchema = z
  .object({
    id: z.number(),
    name: z.string().nullable().optional(),
    display_title: z.string().nullable().optional(),
    html_url: z.string(),
    status: z.string().nullable().optional(),
    conclusion: z.string().nullable().optional(),
    head_branch: z.string().nullable().optional(),
    run_number: z.number().optional(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .passthrough();

const githubWorkflowRunsSchema = z
  .object({
    workflow_runs: z.array(githubWorkflowRunSchema).default([]),
  })
  .passthrough();

type GitHubSearchIssue = z.infer<typeof githubSearchIssueSchema>;
type GitHubWorkflowRun = z.infer<typeof githubWorkflowRunSchema>;

const defaultGhRunner: GhCommandRunner = {
  run: async (args) => {
    assertAllowedGhArgs(args);

    try {
      const { stdout } = await execFileAsync("gh", [...args], {
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      throw new GitHubProviderError(
        "Failed to run GitHub CLI command. Make sure gh is installed and authenticated.",
        { cause: error },
      );
    }
  },
};

function assertAllowedGhArgs(args: readonly string[]) {
  const isUserLookup =
    args.length === 4 && args[0] === "api" && args[1] === "user" && args[2] === "--jq" && args[3] === ".login";

  const isUserEventsLookup =
    args.length === 2 &&
    args[0] === "api" &&
    /^\/users\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/events\?per_page=100$/.test(args[1] ?? "");

  const isRepoCompareLookup =
    args.length === 2 &&
    args[0] === "api" &&
    /^\/repos\/[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+\/compare\/[0-9a-f]{7,40}\.\.\.[0-9a-f]{7,40}$/.test(
      args[1] ?? "",
    );

  const isIssueSearchLookup =
    args.length === 2 &&
    args[0] === "api" &&
    /^\/search\/issues\?q=[A-Za-z0-9%+._~:-]+&per_page=50$/.test(args[1] ?? "");

  const isWorkflowFailureLookup =
    args.length === 2 &&
    args[0] === "api" &&
    /^\/repos\/[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+\/actions\/runs\?status=failure&per_page=20$/.test(
      args[1] ?? "",
    );

  if (
    !isUserLookup &&
    !isUserEventsLookup &&
    !isRepoCompareLookup &&
    !isIssueSearchLookup &&
    !isWorkflowFailureLookup
  ) {
    throw new GitHubProviderError("Blocked non-allowlisted GitHub CLI command");
  }
}

function toIsoDate(value: Date): string {
  return value.toISOString();
}

function getSince(input: GitHubSyncInput, now: Date): Date {
  if (input.since) {
    return new Date(input.since);
  }

  return new Date(now.getTime() - input.lookbackHours * hourInMs);
}

function getStringRecordValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getNumberRecordValue(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getNestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getNestedArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function repoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

function branchName(ref: string | undefined): string | undefined {
  return ref?.replace(/^refs\/heads\//, "");
}

function commitUrl(repo: string, sha: string | undefined): string | undefined {
  return sha ? `${repoUrl(repo)}/commit/${sha}` : undefined;
}

function commitMetadata(
  repo: string,
  sha: string | undefined,
  message: string | undefined,
  url?: string,
): PushCommit[] {
  if (!sha && !message) {
    return [];
  }

  const resolvedUrl = url ?? commitUrl(repo, sha);

  return [
    {
      ...(sha ? { sha } : {}),
      message: message ?? (sha ? `Commit ${sha.slice(0, 7)}` : "Commit"),
      ...(resolvedUrl ? { url: resolvedUrl } : {}),
    },
  ];
}

function payloadPushCommits(repo: string, payload: Record<string, unknown>): PushCommit[] {
  return getNestedArray(payload, "commits").flatMap((commit) => {
    if (!commit || typeof commit !== "object" || Array.isArray(commit)) {
      return [];
    }

    const commitRecord = commit as Record<string, unknown>;
    const sha = getStringRecordValue(commitRecord, "sha");
    const message = getStringRecordValue(commitRecord, "message");

    return commitMetadata(repo, sha, message);
  });
}

function getComparePath(repo: string, payload: Record<string, unknown>): string | undefined {
  const before = getStringRecordValue(payload, "before");
  const head = getStringRecordValue(payload, "head");

  if (!before || !head || /^0+$/.test(before) || before === head) {
    return undefined;
  }

  if (!/^[0-9a-f]{7,40}$/.test(before) || !/^[0-9a-f]{7,40}$/.test(head)) {
    return undefined;
  }

  if (!/^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+$/.test(repo)) {
    return undefined;
  }

  return `/repos/${repo}/compare/${before}...${head}`;
}

async function comparePushCommits(
  repo: string,
  payload: Record<string, unknown>,
  runner: GhCommandRunner,
): Promise<PushCommit[]> {
  const comparePath = getComparePath(repo, payload);

  if (!comparePath) {
    return [];
  }

  let rawCompare: string;
  try {
    rawCompare = await runner.run(["api", comparePath]);
  } catch {
    return [];
  }

  let parsedCompare: unknown;
  try {
    parsedCompare = JSON.parse(rawCompare);
  } catch {
    return [];
  }

  const compare = githubCompareSchema.safeParse(parsedCompare);

  if (!compare.success) {
    return [];
  }

  return compare.data.commits.flatMap((commit) =>
    commitMetadata(repo, commit.sha, commit.commit?.message, commit.html_url),
  );
}

async function pushCommits(
  repo: string,
  payload: Record<string, unknown>,
  runner: GhCommandRunner,
): Promise<PushCommit[]> {
  const commits = payloadPushCommits(repo, payload);

  if (commits.length > 0) {
    return commits;
  }

  return comparePushCommits(repo, payload, runner);
}

function pushCommitCount(payload: Record<string, unknown>, commits: PushCommit[]) {
  if (commits.length > 0) {
    return commits.length;
  }

  const payloadCommitCount = getNestedArray(payload, "commits").length;

  if (payloadCommitCount > 0) {
    return payloadCommitCount;
  }

  const size = getNumberRecordValue(payload, "size");

  if (size !== undefined) {
    return size;
  }

  return 0;
}

function parseJson(rawJson: string, errorMessage: string): unknown {
  try {
    return JSON.parse(rawJson);
  } catch (error) {
    throw new GitHubProviderError(errorMessage, { cause: error });
  }
}

function searchIssuesPath(query: string): string {
  const params = new URLSearchParams({
    q: query,
    per_page: "50",
  });

  return `/search/issues?${params.toString()}`;
}

function workflowFailuresPath(repo: string): string {
  return `/repos/${repo}/actions/runs?status=failure&per_page=20`;
}

function repoFromRepositoryUrl(repositoryUrl: string): string | undefined {
  const marker = "/repos/";
  const markerIndex = repositoryUrl.lastIndexOf(marker);

  if (markerIndex === -1) {
    return undefined;
  }

  const repo = repositoryUrl.slice(markerIndex + marker.length);
  return /^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+$/.test(repo) ? repo : undefined;
}

function isPullRequestSearchItem(item: GitHubSearchIssue): boolean {
  return item.pull_request !== undefined;
}

function attentionSummary(kind: GitHubAttentionItemKind, item: GitHubSearchIssue, repo: string): string {
  const subject = isPullRequestSearchItem(item) ? "PR" : "issue";

  switch (kind) {
    case "review_request":
      return `Review requested on PR #${item.number} in ${repo}.`;
    case "assigned":
      return `Assigned open ${subject} #${item.number} in ${repo}.`;
    case "mention":
      return `Mentioned in open ${subject} #${item.number} in ${repo}.`;
    case "failed_workflow":
      return `Failed workflow in ${repo}.`;
  }
}

function attentionItemFromSearchItem(
  kind: Exclude<GitHubAttentionItemKind, "failed_workflow">,
  item: GitHubSearchIssue,
): GitHubAttentionItem[] {
  const repo = repoFromRepositoryUrl(item.repository_url);

  if (!repo) {
    return [];
  }

  return [
    {
      id: `github:attention:${kind}:${item.id}`,
      kind,
      repo,
      title: item.title,
      summary: attentionSummary(kind, item, repo),
      url: item.html_url,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      metadata: {
        number: item.number,
        subjectType: isPullRequestSearchItem(item) ? "pull_request" : "issue",
      },
    },
  ];
}

function attentionItemFromWorkflowRun(repo: string, run: GitHubWorkflowRun): GitHubAttentionItem {
  const workflowName = run.name ?? "workflow";
  const title = run.display_title ?? `${workflowName} failed`;
  const branch = run.head_branch ?? "unknown branch";

  return {
    id: `github:attention:failed_workflow:${repo}:${run.id}`,
    kind: "failed_workflow",
    repo,
    title,
    summary: `${workflowName} failed on ${branch}.`,
    url: run.html_url,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    metadata: {
      workflowName,
      branch,
      status: run.status,
      conclusion: run.conclusion,
      runNumber: run.run_number,
    },
  };
}

function dedupeAttentionItems(items: GitHubAttentionItem[]): GitHubAttentionItem[] {
  const itemsByUrl = new Map<string, GitHubAttentionItem>();

  for (const item of items) {
    if (!itemsByUrl.has(item.url)) {
      itemsByUrl.set(item.url, item);
    }
  }

  return [...itemsByUrl.values()];
}

function eventType(type: string): GitHubActivityType {
  switch (type) {
    case "PushEvent":
      return "push";
    case "PullRequestEvent":
      return "pull_request";
    case "IssuesEvent":
      return "issue";
    case "IssueCommentEvent":
      return "issue_comment";
    case "PullRequestReviewEvent":
      return "pull_request_review";
    case "PullRequestReviewCommentEvent":
      return "pull_request_review_comment";
    case "CommitCommentEvent":
      return "commit_comment";
    case "CreateEvent":
      return "create";
    case "DeleteEvent":
      return "delete";
    case "ReleaseEvent":
      return "release";
    default:
      return "unknown";
  }
}

function pullRequestTitle(payload: Record<string, unknown>): string | undefined {
  return getStringRecordValue(getNestedRecord(payload, "pull_request") ?? {}, "title");
}

function pullRequestUrl(payload: Record<string, unknown>): string | undefined {
  return getStringRecordValue(getNestedRecord(payload, "pull_request") ?? {}, "html_url");
}

function pullRequestNumber(payload: Record<string, unknown>): number | undefined {
  return getNumberRecordValue(getNestedRecord(payload, "pull_request") ?? {}, "number");
}

function issueTitle(payload: Record<string, unknown>): string | undefined {
  return getStringRecordValue(getNestedRecord(payload, "issue") ?? {}, "title");
}

function issueUrl(payload: Record<string, unknown>): string | undefined {
  return getStringRecordValue(getNestedRecord(payload, "issue") ?? {}, "html_url");
}

function issueNumber(payload: Record<string, unknown>): number | undefined {
  return getNumberRecordValue(getNestedRecord(payload, "issue") ?? {}, "number");
}

async function activityFromEvent(event: GitHubEvent, runner: GhCommandRunner): Promise<GitHubActivity> {
  const payload = event.payload;
  const repo = event.repo.name;
  const action = getStringRecordValue(payload, "action") ?? "updated";
  const type = eventType(event.type);

  if (type === "push") {
    const commits = await pushCommits(repo, payload, runner);
    const commitCount = pushCommitCount(payload, commits);
    const branch = branchName(getStringRecordValue(payload, "ref"));
    const target = branch ? `${repo}:${branch}` : repo;
    const title =
      commitCount > 0
        ? `Pushed ${commitCount} ${commitCount === 1 ? "commit" : "commits"} to ${target}`
        : `Updated ${target}`;

    return {
      id: `github:event:${event.id}`,
      type,
      action: "pushed",
      repo,
      title,
      summary:
        commitCount > 0
          ? `Updated ${target} with ${commitCount} ${commitCount === 1 ? "commit" : "commits"}.`
          : `Updated ${target}.`,
      url: repoUrl(repo),
      createdAt: event.created_at,
      metadata: {
        eventType: event.type,
        branch,
        commitCount,
        commits,
      },
    };
  }

  if (type === "pull_request") {
    const title = pullRequestTitle(payload) ?? "pull request";
    const number = pullRequestNumber(payload);
    const numberLabel = number ? `#${number}` : "";

    return {
      id: `github:event:${event.id}`,
      type,
      action,
      repo,
      title: `${action} PR ${numberLabel}: ${title}`.trim(),
      summary: `You ${action} a pull request in ${repo}.`,
      url: pullRequestUrl(payload) ?? repoUrl(repo),
      createdAt: event.created_at,
      metadata: {
        eventType: event.type,
        number,
      },
    };
  }

  if (type === "issue" || type === "issue_comment") {
    const title = issueTitle(payload) ?? "issue";
    const number = issueNumber(payload);
    const numberLabel = number ? `#${number}` : "";
    const verb = type === "issue_comment" ? "commented on" : action;

    return {
      id: `github:event:${event.id}`,
      type,
      action: verb,
      repo,
      title: `${verb} issue ${numberLabel}: ${title}`.trim(),
      summary: `You ${verb} an issue or PR thread in ${repo}.`,
      url: issueUrl(payload) ?? repoUrl(repo),
      createdAt: event.created_at,
      metadata: {
        eventType: event.type,
        number,
      },
    };
  }

  if (type === "pull_request_review" || type === "pull_request_review_comment") {
    const title = pullRequestTitle(payload) ?? "pull request";
    const number = pullRequestNumber(payload);
    const numberLabel = number ? `#${number}` : "";
    const verb = type === "pull_request_review_comment" ? "commented on review" : "reviewed";

    return {
      id: `github:event:${event.id}`,
      type,
      action: verb,
      repo,
      title: `${verb} PR ${numberLabel}: ${title}`.trim(),
      summary: `You ${verb} a pull request in ${repo}.`,
      url: pullRequestUrl(payload) ?? repoUrl(repo),
      createdAt: event.created_at,
      metadata: {
        eventType: event.type,
        number,
      },
    };
  }

  return {
    id: `github:event:${event.id}`,
    type,
    action,
    repo,
    title: `${event.type} in ${repo}`,
    summary: `GitHub recorded ${event.type} activity in ${repo}.`,
    url: repoUrl(repo),
    createdAt: event.created_at,
    metadata: {
      eventType: event.type,
    },
  };
}

function workItemFromActivity(activity: GitHubActivity): WorkItem {
  return {
    id: activity.id.replace("github:event:", "github:activity:"),
    source: "github",
    kind: "github_activity",
    title: activity.title,
    summary: activity.summary,
    ...(activity.url ? { url: activity.url } : {}),
    priority: "low",
    createdAt: activity.createdAt,
    updatedAt: activity.createdAt,
    metadata: {
      activityType: activity.type,
      action: activity.action,
      repo: activity.repo,
      ...activity.metadata,
    },
  };
}

async function searchAttentionItems(
  runner: GhCommandRunner,
  kind: Exclude<GitHubAttentionItemKind, "failed_workflow">,
  query: string,
): Promise<GitHubAttentionItem[]> {
  const rawSearch = await runner.run(["api", searchIssuesPath(query)]);
  const parsedSearch = parseJson(rawSearch, "GitHub CLI returned invalid attention search data.");
  const searchResult = githubSearchIssuesSchema.parse(parsedSearch);
  return searchResult.items.flatMap((item) => attentionItemFromSearchItem(kind, item));
}

async function failedWorkflowItemsForRepo(
  runner: GhCommandRunner,
  repo: string,
  now: Date,
): Promise<GitHubAttentionItem[]> {
  let rawRuns: string;

  try {
    rawRuns = await runner.run(["api", workflowFailuresPath(repo)]);
  } catch {
    return [];
  }

  const parsedRuns = parseJson(rawRuns, "GitHub CLI returned invalid workflow run data.");
  const runs = githubWorkflowRunsSchema.parse(parsedRuns);
  const workflowSince = now.getTime() - attentionWorkflowLookbackMs;

  return runs.workflow_runs
    .filter((run) => run.conclusion === undefined || run.conclusion === null || run.conclusion === "failure")
    .filter((run) => new Date(run.created_at).getTime() >= workflowSince)
    .slice(0, maxFailedWorkflowItemsPerRepo)
    .map((run) => attentionItemFromWorkflowRun(repo, run));
}

export function createGhGitHubProvider(options: GitHubProviderOptions = {}): GitHubProvider {
  const runner = options.runner ?? defaultGhRunner;
  const nowFn = options.now ?? (() => new Date());

  return {
    async syncActivity(input) {
      const now = nowFn();
      const since = getSince(input, now);
      const username = githubUserSchema.parse((await runner.run(["api", "user", "--jq", ".login"])).trim());
      const rawEvents = await runner.run(["api", `/users/${username}/events?per_page=100`]);
      let parsedEvents: unknown;
      try {
        parsedEvents = JSON.parse(rawEvents);
      } catch (error) {
        throw new GitHubProviderError("GitHub CLI returned invalid event data.", {
          cause: error,
        });
      }

      const events = githubEventListSchema.parse(parsedEvents);
      const recentEvents = events.filter((event) => new Date(event.created_at).getTime() >= since.getTime());
      const activities = await Promise.all(recentEvents.map((event) => activityFromEvent(event, runner)));

      return githubSyncResultSchema.parse({
        syncedAt: toIsoDate(now),
        since: toIsoDate(since),
        username,
        activities,
        workItems: activities.map(workItemFromActivity),
        recommendedActions: [],
      });
    },

    async syncAttention(input) {
      const now = nowFn();
      const parsedInput = githubAttentionInputSchema.parse(input);
      const username = githubUserSchema.parse((await runner.run(["api", "user", "--jq", ".login"])).trim());
      const repositories = [...new Set(parsedInput.repositories)];
      const [reviewItems, assignedItems, mentionItems, ...workflowItemGroups] = await Promise.all([
        searchAttentionItems(
          runner,
          "review_request",
          `is:pr state:open review-requested:${username} archived:false`,
        ),
        searchAttentionItems(runner, "assigned", `state:open assignee:${username} archived:false`),
        searchAttentionItems(runner, "mention", `state:open mentions:${username} archived:false`),
        ...repositories.map((repo) => failedWorkflowItemsForRepo(runner, repo, now)),
      ]);

      return githubAttentionResultSchema.parse({
        syncedAt: toIsoDate(now),
        username,
        repositories,
        items: dedupeAttentionItems([
          ...reviewItems,
          ...assignedItems,
          ...mentionItems,
          ...workflowItemGroups.flat(),
        ]),
      });
    },
  };
}

export const defaultGitHubProvider = createGhGitHubProvider();
