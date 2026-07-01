import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@app-starter/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@app-starter/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import {
  AtSign,
  ChevronDown,
  CircleDot,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitGraph,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Tag,
  UserRound,
  XCircle,
  Zap,
} from "lucide-react";

import {
  ApiError,
  getLatestGitHubSync,
  syncGitHub,
  syncGitHubAttention,
  type GitHubActivity,
  type GitHubAttentionItem,
  type GitHubAttentionResult,
  type GitHubSyncSnapshot,
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

const attentionKindLabels: Record<GitHubAttentionItem["kind"], string> = {
  review_request: "Review",
  assigned: "Assigned",
  mention: "Mention",
  failed_workflow: "Workflow",
};

type ActivitySectionKey = (typeof activitySectionOrder)[number];

type ActivitySection = {
  key: ActivitySectionKey;
  label: string;
  activities: GitHubActivity[];
  newActivityCount: number;
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
  newActivityCount: number;
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

function groupActivitiesByRepo(
  activities: GitHubActivity[],
  newActivityIdSet: ReadonlySet<string>,
): ProjectActivityGroup[] {
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
        newActivityCount: 0,
      };
      groupMap.set(activity.repo, group);
    }

    group.activities.push(activity);
    group.sectionMap.get(activitySectionFor(activity.type))?.push(activity);

    if (activity.createdAt > group.latestAt) {
      group.latestAt = activity.createdAt;
    }

    if (newActivityIdSet.has(activity.id)) {
      group.newActivityCount += 1;
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
                newActivityCount: sectionActivities.filter((activity) =>
                  newActivityIdSet.has(activity.id),
                ).length,
              },
            ]
          : [];
      }),
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

function projectStats(project: ProjectActivityGroup) {
  const stats = [
    pluralize(project.newActivityCount, "new activity", "new activities"),
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
  const [syncSnapshot, setSyncSnapshot] = useState<GitHubSyncSnapshot | null>(null);
  const [syncSnapshotLoading, setSyncSnapshotLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [attentionResult, setAttentionResult] = useState<GitHubAttentionResult | null>(null);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [attentionError, setAttentionError] = useState<string | null>(null);

  const loadLatestGitHubSync = useCallback(async () => {
    setSyncSnapshotLoading(true);
    setSyncError(null);

    try {
      setSyncSnapshot(await getLatestGitHubSync());
    } catch (error: unknown) {
      setSyncError(apiErrorMessage(error, "Failed to load GitHub activity"));
    } finally {
      setSyncSnapshotLoading(false);
    }
  }, []);

  const loadGitHubAttention = useCallback(async () => {
    setAttentionLoading(true);
    setAttentionError(null);

    try {
      setAttentionResult(await syncGitHubAttention());
    } catch (error: unknown) {
      setAttentionError(apiErrorMessage(error, "Failed to sync GitHub attention"));
    } finally {
      setAttentionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLatestGitHubSync();
    void loadGitHubAttention();
  }, [loadLatestGitHubSync, loadGitHubAttention]);

  const handleGitHubSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);

    try {
      setSyncSnapshot(await syncGitHub());
      void loadGitHubAttention();
    } catch (error: unknown) {
      setSyncError(apiErrorMessage(error, "Failed to sync GitHub activity"));
    } finally {
      setSyncing(false);
    }
  }, [loadGitHubAttention]);

  const syncResult = syncSnapshot?.lastSync ?? null;
  const newActivityIds = syncSnapshot?.newActivityIds ?? [];
  const githubCount = syncResult?.activities.length ?? 0;
  const newActivityCount = newActivityIds.length;
  const githubProjectCount = useMemo(() => {
    if (!syncResult) {
      return 0;
    }

    return new Set(syncResult.activities.map((activity) => activity.repo)).size;
  }, [syncResult]);
  const attentionCount = attentionResult?.items.length ?? 0;
  const syncWindow = useMemo(() => {
    if (!syncResult) {
      return null;
    }

    return `${formatDateTime(syncResult.since)} -> ${formatDateTime(syncResult.syncedAt)}`;
  }, [syncResult]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-border bg-background py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-md bg-zap-canvas-soft text-zap-primary">
              <Zap className="size-6" />
            </div>
            <div>
              <p className="text-eyebrow text-zap-primary">30-Second Morning</p>
              <h1 className="text-display-sub-sm text-zap-ink">Good morning, Kabeer</h1>
            </div>
          </div>
          <Button 
            onClick={() => void handleGitHubSync()} 
            disabled={syncing}
            className="rounded-md bg-primary text-zap-on-primary text-body-sm-strong hover:bg-primary/90 shadow-none px-6 py-2 h-auto"
          >
            <RefreshCw className={syncing ? "animate-spin" : undefined} data-icon="inline-start" />
            {syncing ? "Syncing workspace" : "Sync GitHub"}
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="card-content">
            <CardHeader className="pb-2 p-0 mb-4">
              <CardTitle className="flex items-center gap-2 text-body-sm-strong text-zap-ink">
                <GitGraph className="size-4 text-zap-body" />
                GitHub Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-display-md text-zap-ink">{githubCount}</p>
              <p className="mt-1 text-body-sm text-zap-body">
                {syncResult
                  ? `Across ${pluralize(githubProjectCount, "project")}`
                  : "Sync to load activity"}
              </p>
            </CardContent>
          </Card>
          <Card className="card-content">
            <CardHeader className="pb-2 p-0 mb-4">
              <CardTitle className="flex items-center gap-2 text-body-sm-strong text-zap-ink">
                <Sparkles className="size-4 text-zap-body" />
                New Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-display-md text-zap-ink">{newActivityCount}</p>
              <p className="mt-1 text-body-sm text-zap-body">
                {syncResult ? "Since previous sync" : "After first sync"}
              </p>
            </CardContent>
          </Card>
          <Card className="card-feature-dark">
            <CardHeader className="pb-2 p-0 mb-4">
              <CardTitle className="flex items-center gap-2 text-body-sm-strong text-zap-on-primary">
                <CircleDot className="size-4 text-zap-mute" />
                Attention Required
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-display-md text-zap-primary">{attentionCount}</p>
              <p className="mt-1 text-body-sm text-zap-on-primary">Open items</p>
            </CardContent>
          </Card>
        </div>

      {syncError ? (
        <StatusPanel
          message={syncError}
          actionLabel="Retry sync"
          onAction={() => void handleGitHubSync()}
        />
      ) : null}
      {attentionError ? (
        <StatusPanel
          message={attentionError}
          actionLabel="Retry attention"
          onAction={() => void loadGitHubAttention()}
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
        <Card className="card-content p-0 border border-border">
          <CardHeader className="border-b border-border bg-zap-canvas-soft p-6">
            <CardTitle className="text-display-sub-sm text-zap-ink">Activity Feed</CardTitle>
            <p className="text-body-sm text-zap-body">
              {syncWindow ?? "Last 24 hours after sync"}
            </p>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {syncing ? (
              <LoadingState label="Syncing GitHub activity..." />
            ) : syncSnapshotLoading ? (
              <LoadingState label="Loading saved GitHub activity..." />
            ) : syncResult ? (
              <GitHubActivityList
                activities={syncResult.activities}
                newActivityIds={newActivityIds}
              />
            ) : (
              <EmptyState label="No GitHub sync yet." />
            )}
          </CardContent>
        </Card>

        <Card className="card-content p-0 border border-border h-fit">
          <CardHeader className="border-b border-border bg-zap-canvas-soft p-6">
            <CardTitle className="text-display-sub-sm text-zap-ink">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {attentionLoading ? (
              <LoadingState label="Syncing attention..." />
            ) : attentionResult?.items.length ? (
              <AttentionList items={attentionResult.items} />
            ) : (
              <EmptyState label="You're all caught up! No items need your attention right now." />
            )}
          </CardContent>
        </Card>
      </section>
      </div>
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
    <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-destructive">
        <XCircle className="size-4" />
        <p className="font-medium">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onAction} className="border-destructive/30 hover:bg-destructive/10">
        {actionLabel}
      </Button>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
      <RefreshCw className="mb-4 size-6 animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-12 text-center text-muted-foreground">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
        <Sparkles className="size-5" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function GitHubActivityList({
  activities,
  newActivityIds,
}: {
  activities: GitHubActivity[];
  newActivityIds: string[];
}) {
  const newActivityIdSet = useMemo(() => new Set(newActivityIds), [newActivityIds]);
  const projects = useMemo(
    () => groupActivitiesByRepo(activities, newActivityIdSet),
    [activities, newActivityIdSet],
  );

  if (activities.length === 0) {
    return <EmptyState label="No GitHub activity found in this window." />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {projects.map((project, index) => (
        <ProjectActivityGroupView
          key={project.repo}
          project={project}
          newActivityIdSet={newActivityIdSet}
          isDefaultExpanded={index === 0}
        />
      ))}
    </div>
  );
}

function ProjectActivityGroupView({
  project,
  newActivityIdSet,
  isDefaultExpanded,
}: {
  project: ProjectActivityGroup;
  newActivityIdSet: ReadonlySet<string>;
  isDefaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isDefaultExpanded || project.newActivityCount > 0);

  return (
    <section className="mb-2 rounded-md border border-border bg-background shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div 
        className="flex flex-col gap-3 border-b border-border bg-zap-canvas-soft p-6 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-black/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-body-md-strong text-zap-ink">{project.repo}</p>
            {project.newActivityCount > 0 ? <NewBadge /> : null}
            <span className="text-caption text-zap-mute">
              Latest {formatDateTime(project.latestAt)}
            </span>
          </div>
          <p className="mt-1 break-words text-caption text-zap-body">{projectStats(project)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${project.repo} on GitHub`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-4 text-zap-body hover:text-zap-ink" />
          </a>
          <button className="p-2 text-zap-body hover:text-zap-ink transition-colors">
            <ChevronDown className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-4 p-6">
          {project.sections.map((section) => (
            <section key={section.key} className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center justify-between gap-3 bg-zap-canvas-soft px-6 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <p className="text-eyebrow text-zap-ink">
                    {section.label}
                  </p>
                  {section.newActivityCount > 0 ? <NewBadge /> : null}
                </div>
                <span className="text-caption text-zap-mute">
                  {pluralize(section.activities.length, "item")}
                </span>
              </div>
              <ul className="flex flex-col">
                {section.activities.map((activity) => (
                  <ProjectActivityRow
                    key={activity.id}
                    activity={activity}
                    isNew={newActivityIdSet.has(activity.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectActivityRow({
  activity,
  isNew,
}: {
  activity: GitHubActivity;
  isNew: boolean;
}) {
  const commits = activity.type === "push" ? getPushCommits(activity) : [];

  return (
    <li className="px-6 py-4 hover:bg-zap-canvas-soft border-b border-border last:border-b-0 transition-colors">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-zap-canvas-soft text-zap-ink border border-border">
            <ActivityTypeIcon type={activity.type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-border/20 px-2 py-0.5 text-[11px] font-medium text-zap-ink">
                {activityLabels[activity.type]}
              </span>
              {isNew ? <NewBadge /> : null}
              <span className="text-caption text-zap-mute">
                {formatDateTime(activity.createdAt)}
              </span>
            </div>
            <p className="mt-2 break-words text-body-sm-strong text-zap-ink">{activity.title}</p>
            <p className="mt-1 break-words text-body-sm text-zap-body">{activity.summary}</p>
            {commits.length ? <CommitList commits={commits} /> : null}
          </div>
        </div>

        {activity.url ? (
          <a
            className={buttonVariants({ variant: "ghost", size: "icon-xs", className: "shrink-0 opacity-50 transition-opacity hover:opacity-100 text-zap-body hover:text-zap-ink" })}
            href={activity.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open GitHub activity"
          >
            <ExternalLink className="size-4" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function NewBadge() {
  return <span className="animate-pulse rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">New</span>;
}

function ActivityTypeIcon({ type }: { type: GitHubActivity["type"] }) {
  const className = "size-4 shrink-0";

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

function AttentionList({ items }: { items: GitHubAttentionItem[] }) {
  const groupedItems = useMemo(() => {
    const map = new Map<string, GitHubAttentionItem[]>();
    for (const item of items) {
      if (!map.has(item.repo)) map.set(item.repo, []);
      map.get(item.repo)!.push(item);
    }
    return Array.from(map.entries()).map(([repo, repoItems]) => ({ repo, items: repoItems }));
  }, [items]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {groupedItems.map((group, index) => (
        <AttentionGroupView key={group.repo} repo={group.repo} items={group.items} isDefaultExpanded={index === 0} />
      ))}
    </div>
  );
}

function AttentionGroupView({ repo, items, isDefaultExpanded }: { repo: string; items: GitHubAttentionItem[]; isDefaultExpanded: boolean }) {
  const [isExpanded, setIsExpanded] = useState(isDefaultExpanded);

  return (
    <section className="mb-2 rounded-md border border-border bg-background shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div 
        className="flex items-center justify-between gap-3 bg-zap-canvas-soft px-6 py-4 border-b border-border cursor-pointer hover:bg-black/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <p className="text-body-md-strong text-zap-ink">
            {repo}
          </p>
          <span className="text-caption text-zap-primary font-medium">
            {pluralize(items.length, "item")}
          </span>
        </div>
        <button className="p-2 text-zap-body hover:text-zap-ink transition-colors">
          <ChevronDown className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      
      {isExpanded && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 p-6 hover:bg-zap-canvas-soft border-b border-border last:border-b-0 transition-colors">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-zap-canvas-soft border border-border text-zap-ink">
                <AttentionIcon kind={item.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-border/20 px-2 py-0.5 text-[11px] font-medium text-zap-ink">
                    {attentionKindLabels[item.kind]}
                  </span>
                </div>
                <p className="mt-2 break-words text-body-sm-strong text-zap-ink">{item.title}</p>
                <p className="mt-1 break-words text-body-sm text-zap-body">{item.summary}</p>
              </div>
              <a
                className={buttonVariants({ variant: "ghost", size: "icon-xs", className: "shrink-0 opacity-50 transition-opacity hover:opacity-100 text-zap-body hover:text-zap-ink" })}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open attention item"
              >
                <ExternalLink className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionIcon({ kind }: { kind: GitHubAttentionItem["kind"] }) {
  const className = "size-4 shrink-0";

  switch (kind) {
    case "review_request":
      return <GitPullRequest className={className} />;
    case "assigned":
      return <UserRound className={className} />;
    case "mention":
      return <AtSign className={className} />;
    case "failed_workflow":
      return <XCircle className={className} />;
  }
}
