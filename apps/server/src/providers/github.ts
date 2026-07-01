import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  githubSyncResultSchema,
  type GitHubActivity,
  type GitHubActivityType,
  type GitHubSyncInput,
  type GitHubSyncResult,
} from "@app-starter/contracts/github";
import type { WorkItem } from "@app-starter/contracts/morning-brief";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const hourInMs = 60 * 60 * 1000;

export type GhCommandRunner = {
  run: (args: readonly string[]) => Promise<string>;
};

export type GitHubProvider = {
  syncActivity: (input: GitHubSyncInput) => Promise<GitHubSyncResult>;
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

  if (!isUserLookup && !isUserEventsLookup && !isRepoCompareLookup) {
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
  };
}

export const defaultGitHubProvider = createGhGitHubProvider();
