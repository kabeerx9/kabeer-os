import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@app-starter/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@app-starter/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import {
  CircleDot,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
  Tag,
} from "lucide-react";

import {
  ApiError,
  getMorningBrief,
  syncGitHub,
  type GitHubActivity,
  type GitHubSyncResult,
  type MorningBrief,
  type RecommendedAction,
} from "@/lib/api";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

const activityLabels: Record<GitHubActivity["type"], string> = {
  push: "Push",
  pull_request: "Pull request",
  issue: "Issue",
  issue_comment: "Comment",
  pull_request_review: "Review",
  pull_request_review_comment: "Review comment",
  commit_comment: "Commit comment",
  create: "Create",
  delete: "Delete",
  release: "Release",
  unknown: "Activity",
};

const activitySectionLabels = {
  pushes: "Pushes",
  issues: "Issues",
  pull_requests: "Pull requests",
  other: "Other",
} as const;

const activitySectionOrder = ["pushes", "issues", "pull_requests", "other"] as const;

type ActivitySectionKey = (typeof activitySectionOrder)[number];

type ActivitySection = {
  key: ActivitySectionKey;
  label: string;
  activities: GitHubActivity[];
};

type ProjectActivityGroup = {
  repo: string;
  repoUrl: string;
  latestAt: string;
  activities: GitHubActivity[];
  sections: ActivitySection[];
  pushCount: number;
  commitCount: number;
  issueCount: number;
  pullRequestCount: number;
};

type MutableProjectActivityGroup = Omit<ProjectActivityGroup, "sections"> & {
  sectionMap: Map<ActivitySectionKey, GitHubActivity[]>;
};

type CommitMetadata = {
  sha?: string;
  message: string;
  url?: string;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  day: "numeric",
});

function formatDateTime(value: string) {
  return dateFormatter.format(new Date(value));
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function sortActivitiesNewestFirst(a: GitHubActivity, b: GitHubActivity) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function repoUrl(repo: string) {
  return `https://github.com/${repo
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function activitySectionFor(type: GitHubActivity["type"]): ActivitySectionKey {
  switch (type) {
    case "push":
      return "pushes";
    case "issue":
    case "issue_comment":
      return "issues";
    case "pull_request":
    case "pull_request_review":
    case "pull_request_review_comment":
      return "pull_requests";
    default:
      return "other";
  }
}

function createSectionMap() {
  const sectionMap = new Map<ActivitySectionKey, GitHubActivity[]>();

  for (const key of activitySectionOrder) {
    sectionMap.set(key, []);
  }

  return sectionMap;
}

function getCommitCount(activity: GitHubActivity) {
  const value = activity.metadata["commitCount"];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return getPushCommits(activity).length;
}

function groupActivitiesByRepo(activities: GitHubActivity[]): ProjectActivityGroup[] {
  const groupMap = new Map<string, MutableProjectActivityGroup>();

  for (const activity of activities) {
    let group = groupMap.get(activity.repo);

    if (!group) {
      group = {
        repo: activity.repo,
        repoUrl: repoUrl(activity.repo),
        latestAt: activity.createdAt,
        activities: [],
        sectionMap: createSectionMap(),
        pushCount: 0,
        commitCount: 0,
        issueCount: 0,
        pullRequestCount: 0,
      };
      groupMap.set(activity.repo, group);
    }

    group.activities.push(activity);
    group.sectionMap.get(activitySectionFor(activity.type))?.push(activity);

    if (activity.createdAt > group.latestAt) {
      group.latestAt = activity.createdAt;
    }

    if (activity.type === "push") {
      group.pushCount += 1;
      group.commitCount += getCommitCount(activity);
    } else if (activity.type === "issue" || activity.type === "issue_comment") {
      group.issueCount += 1;
    } else if (
      activity.type === "pull_request" ||
      activity.type === "pull_request_review" ||
      activity.type === "pull_request_review_comment"
    ) {
      group.pullRequestCount += 1;
    }
  }

  return [...groupMap.values()]
    .map(({ sectionMap, ...group }) => ({
      ...group,
      activities: [...group.activities].sort(sortActivitiesNewestFirst),
      sections: activitySectionOrder.flatMap((key) => {
        const sectionActivities = sectionMap.get(key) ?? [];

        return sectionActivities.length
          ? [
              {
                key,
                label: activitySectionLabels[key],
                activities: [...sectionActivities].sort(sortActivitiesNewestFirst),
              },
            ]
          : [];
      }),
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

function projectStats(project: ProjectActivityGroup) {
  const stats = [
    pluralize(project.activities.length, "activity", "activities"),
    pluralize(project.pushCount, "push", "pushes"),
    pluralize(project.commitCount, "commit"),
    pluralize(project.issueCount, "issue event"),
    pluralize(project.pullRequestCount, "PR event"),
  ];

  return stats.filter((stat) => !stat.startsWith("0 ")).join(", ");
}

function getStringValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getPushCommits(activity: GitHubActivity): CommitMetadata[] {
  const commits = activity.metadata["commits"];

  if (!Array.isArray(commits)) {
    return [];
  }

  return commits.flatMap((commit) => {
    if (!commit || typeof commit !== "object" || Array.isArray(commit)) {
      return [];
    }

    const commitRecord = commit as Record<string, unknown>;
    const sha = getStringValue(commitRecord, "sha");
    const message = getStringValue(commitRecord, "message");
    const url = getStringValue(commitRecord, "url");

    if (!message && !sha) {
      return [];
    }

    return [
      {
        ...(sha ? { sha } : {}),
        message: message ?? `Commit ${shortSha(sha ?? "")}`,
        ...(url ? { url } : {}),
      },
    ];
  });
}

function firstCommitLine(message: string) {
  return message.split(/\r?\n/, 1)[0]?.trim() || message.trim();
}

function shortSha(sha: string) {
  return sha.slice(0, 7);
}

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function DashboardPage() {
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<GitHubSyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadBrief = useCallback(async () => {
    setBriefLoading(true);
    setBriefError(null);

    try {
      setBrief(await getMorningBrief());
    } catch (error: unknown) {
      setBriefError(apiErrorMessage(error, "Failed to load morning brief"));
    } finally {
      setBriefLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  const handleGitHubSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);

    try {
      setSyncResult(await syncGitHub());
    } catch (error: unknown) {
      setSyncError(apiErrorMessage(error, "Failed to sync GitHub activity"));
    } finally {
      setSyncing(false);
    }
  }, []);

  const githubCount = syncResult?.activities.length ?? 0;
  const githubProjectCount = useMemo(() => {
    if (!syncResult) {
      return 0;
    }

    return new Set(syncResult.activities.map((activity) => activity.repo)).size;
  }, [syncResult]);
  const recommendedCount = brief?.recommendedActions.length ?? 0;
  const highPriorityCount = brief?.summary.highPriorityCount ?? 0;
  const syncWindow = useMemo(() => {
    if (!syncResult) {
      return null;
    }

    return `${formatDateTime(syncResult.since)} -> ${formatDateTime(syncResult.syncedAt)}`;
  }, [syncResult]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">30-Second Morning</p>
          <h1 className="text-2xl font-semibold">Good morning, Kabeer</h1>
        </div>
        <Button onClick={() => void handleGitHubSync()} disabled={syncing}>
          <RefreshCw className={syncing ? "animate-spin" : undefined} data-icon="inline-start" />
          {syncing ? "Syncing" : "Sync GitHub"}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GitHub</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{githubCount}</p>
            <p className="text-sm text-muted-foreground">
              {syncResult
                ? `activities across ${pluralize(githubProjectCount, "project")}`
                : "sync to load activity"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{recommendedCount}</p>
            <p className="text-sm text-muted-foreground">next actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{highPriorityCount}</p>
            <p className="text-sm text-muted-foreground">high priority items</p>
          </CardContent>
        </Card>
      </div>

      {briefError ? (
        <StatusPanel message={briefError} actionLabel="Retry" onAction={() => void loadBrief()} />
      ) : null}
      {syncError ? (
        <StatusPanel
          message={syncError}
          actionLabel="Retry sync"
          onAction={() => void handleGitHubSync()}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>GitHub activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              {syncWindow ?? "Last 24 hours after sync"}
            </p>
          </CardHeader>
          <CardContent>
            {syncing ? (
              <LoadingState label="Syncing GitHub activity..." />
            ) : syncResult ? (
              <GitHubActivityList activities={syncResult.activities} />
            ) : (
              <EmptyState label="No GitHub sync yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended actions</CardTitle>
          </CardHeader>
          <CardContent>
            {briefLoading ? (
              <LoadingState label="Loading recommendations..." />
            ) : brief?.recommendedActions.length ? (
              <RecommendedActionList actions={brief.recommendedActions} />
            ) : (
              <EmptyState label="No recommendations right now." />
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  );
}

function StatusPanel({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border border-destructive/30 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-destructive">{message}</p>
      <Button variant="outline" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="border border-dashed p-4 text-sm text-muted-foreground">{label}</p>;
}

function GitHubActivityList({ activities }: { activities: GitHubActivity[] }) {
  const projects = useMemo(() => groupActivitiesByRepo(activities), [activities]);

  if (activities.length === 0) {
    return <EmptyState label="No GitHub activity found in this window." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {projects.map((project) => (
        <ProjectActivityGroupView key={project.repo} project={project} />
      ))}
    </div>
  );
}

function ProjectActivityGroupView({ project }: { project: ProjectActivityGroup }) {
  return (
    <section className="overflow-hidden border">
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-semibold">{project.repo}</p>
            <span className="text-xs text-muted-foreground">
              Latest {formatDateTime(project.latestAt)}
            </span>
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">{projectStats(project)}</p>
        </div>
        <a
          className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
          href={project.repoUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${project.repo} on GitHub`}
        >
          <ExternalLink />
        </a>
      </div>

      <div className="divide-y">
        {project.sections.map((section) => (
          <section key={section.key}>
            <div className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">
                {section.label}
              </p>
              <span className="text-xs text-muted-foreground">
                {pluralize(section.activities.length, "item")}
              </span>
            </div>
            <ul className="divide-y">
              {section.activities.map((activity) => (
                <ProjectActivityRow key={activity.id} activity={activity} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

function ProjectActivityRow({ activity }: { activity: GitHubActivity }) {
  const commits = activity.type === "push" ? getPushCommits(activity) : [];

  return (
    <li className="px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <ActivityTypeIcon type={activity.type} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border px-2 py-0.5 text-[11px] text-muted-foreground">
                {activityLabels[activity.type]}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(activity.createdAt)}
              </span>
            </div>
            <p className="mt-1 break-words text-sm font-medium">{activity.title}</p>
            <p className="break-words text-xs text-muted-foreground">{activity.summary}</p>
            {commits.length ? <CommitList commits={commits} /> : null}
          </div>
        </div>

        {activity.url ? (
          <a
            className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
            href={activity.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open GitHub activity"
          >
            <ExternalLink />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function ActivityTypeIcon({ type }: { type: GitHubActivity["type"] }) {
  const className = "mt-0.5 size-4 shrink-0 text-muted-foreground";

  switch (type) {
    case "push":
      return <GitCommit className={className} />;
    case "pull_request":
    case "pull_request_review":
    case "pull_request_review_comment":
      return <GitPullRequest className={className} />;
    case "issue":
      return <CircleDot className={className} />;
    case "issue_comment":
    case "commit_comment":
      return <MessageSquare className={className} />;
    case "release":
    case "create":
    case "delete":
      return <Tag className={className} />;
    default:
      return <GitBranch className={className} />;
  }
}

function CommitList({ commits }: { commits: CommitMetadata[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {commits.map((commit, index) => (
        <li
          key={`${commit.sha ?? commit.message}-${index}`}
          className="flex min-w-0 items-start gap-2 text-xs"
        >
          <GitCommit className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {commit.sha ? (
                commit.url ? (
                  <a
                    className="font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                    href={commit.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortSha(commit.sha)}
                  </a>
                ) : (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {shortSha(commit.sha)}
                  </span>
                )
              ) : null}
              <span className="break-words">{firstCommitLine(commit.message)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RecommendedActionList({ actions }: { actions: RecommendedAction[] }) {
  return (
    <ul className="flex flex-col divide-y">
      {actions.map((action) => (
        <li key={action.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <GitBranch className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{action.label}</p>
            <p className="break-words text-xs text-muted-foreground">{action.reason}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
