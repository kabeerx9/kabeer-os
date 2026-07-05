import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@app-starter/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@app-starter/ui/components/card";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@app-starter/ui/components/message-scroller";
import { createFileRoute } from "@tanstack/react-router";
import {
  AtSign,
  Bot,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitGraph,
  Inbox,
  ListChecks,
  MessageSquare,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  Tag,
  Target,
  UserRound,
  XCircle,
  Zap,
} from "lucide-react";

import {
  ApiError,
  generateGitHubDailySummary,
  getLatestGitHubSync,
  sendAssistantMessage,
  syncGitHub,
  syncGitHubAttention,
  type AssistantMessage,
  type AssistantStep,
  type GitHubActivity,
  type GitHubAttentionItem,
  type GitHubAttentionResult,
  type GitHubDailySummaryInput,
  type GitHubDailySummaryResult,
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

const emptyNewActivityIds: string[] = [];

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

type DashboardChatMessage = {
  id: string;
  role: AssistantMessage["role"];
  content: string;
  steps?: AssistantStep[];
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

function createChatMessageId(role: AssistantMessage["role"]) {
  return `${role}-${crypto.randomUUID()}`;
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
  const [dailySummary, setDailySummary] = useState<GitHubDailySummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  const loadGitHubDailySummary = useCallback(async (input: GitHubDailySummaryInput) => {
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      setDailySummary(await generateGitHubDailySummary(input));
    } catch (error: unknown) {
      setSummaryError(apiErrorMessage(error, "Failed to generate GitHub summary"));
    } finally {
      setSummaryLoading(false);
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
  const newActivityIds = syncSnapshot?.newActivityIds ?? emptyNewActivityIds;
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

  useEffect(() => {
    if (syncSnapshotLoading || attentionLoading) {
      return;
    }

    void loadGitHubDailySummary({
      sync: syncResult,
      newActivityIds,
      attention: attentionResult,
    });
  }, [
    attentionLoading,
    attentionResult,
    loadGitHubDailySummary,
    newActivityIds,
    syncResult,
    syncSnapshotLoading,
  ]);

  return (
    <div className="min-h-full bg-background pb-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
        <header className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-primary">
                30-Second Morning
              </p>
              <h1 className="truncate text-2xl font-semibold tracking-normal text-foreground">
                Good morning, Kabeer
              </h1>
            </div>
          </div>
          <Button
            onClick={() => void handleGitHubSync()}
            disabled={syncing}
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
          >
            <RefreshCw className={syncing ? "animate-spin" : undefined} data-icon="inline-start" />
            {syncing ? "Syncing workspace" : "Sync GitHub"}
          </Button>
        </header>

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
        {summaryError ? (
          <StatusPanel
            message={summaryError}
            actionLabel="Retry summary"
            onAction={() =>
              void loadGitHubDailySummary({
                sync: syncResult,
                newActivityIds,
                attention: attentionResult,
              })
            }
          />
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_minmax(340px,0.86fr)]">
          <MorningBriefPanel
            githubCount={githubCount}
            githubProjectCount={githubProjectCount}
            newActivityCount={newActivityCount}
            attentionCount={attentionCount}
          />

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <DashboardMetricCard
                icon={<GitGraph className="size-4" />}
                label="Activity"
                value={githubCount}
                detail={syncResult ? `Across ${pluralize(githubProjectCount, "project")}` : "Sync to load"}
              />
              <DashboardMetricCard
                icon={<Sparkles className="size-4" />}
                label="New"
                value={newActivityCount}
                detail={syncResult ? "Since previous sync" : "After first sync"}
              />
              <DashboardMetricCard
                icon={<CircleDot className="size-4" />}
                label="Attention"
                value={attentionCount}
                detail="Open items"
                tone="attention"
              />
            </div>

            <Card className="operator-panel p-0">
              <CardHeader className="border-b border-border bg-muted/45 p-5">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  Daily Summary
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Deterministic summary from GitHub activity and attention signals
                </p>
              </CardHeader>
              <CardContent className="p-5">
                {summaryLoading ? (
                  <LoadingState label="Generating summary..." />
                ) : dailySummary ? (
                  <DailySummaryPanel summary={dailySummary} />
                ) : (
                  <EmptyState label="No summary generated yet." />
                )}
              </CardContent>
            </Card>

            <Card className="operator-panel p-0">
              <CardHeader className="border-b border-border bg-muted/45 p-5">
                <CardTitle className="text-lg font-semibold text-foreground">Activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {syncWindow ?? "Last 24 hours after sync"}
                </p>
              </CardHeader>
              <CardContent className="p-0">
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
          </div>

          <Card className="operator-panel h-fit p-0">
            <CardHeader className="border-b border-border bg-muted/45 p-5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Inbox className="size-4 text-primary" />
                  Attention
                </CardTitle>
                <span className="status-chip border-primary/25 bg-primary/10 text-primary">
                  {attentionCount} open
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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

        <AssistantChatPanel />
      </div>
    </div>
  );
}

function MorningBriefPanel({
  githubCount,
  githubProjectCount,
  newActivityCount,
  attentionCount,
}: {
  githubCount: number;
  githubProjectCount: number;
  newActivityCount: number;
  attentionCount: number;
}) {
  const briefItems = [
    {
      label: "Today's priorities",
      detail: newActivityCount ? "New work needs sorting" : "Focus on key outcomes",
      value: Math.max(newActivityCount, attentionCount),
      icon: Target,
    },
    {
      label: "Tracked projects",
      detail: githubProjectCount ? "Repositories with movement" : "Sync to populate projects",
      value: githubProjectCount,
      icon: CalendarClock,
    },
    {
      label: "Attention required",
      detail: "Reviews, mentions, assignments",
      value: attentionCount,
      icon: CircleDot,
    },
    {
      label: "Waiting for you",
      detail: "Updates and approvals",
      value: newActivityCount,
      icon: Clock3,
    },
    {
      label: "Activity captured",
      detail: "Signals in the sync window",
      value: githubCount,
      icon: CheckCircle2,
    },
  ];

  return (
    <aside className="operator-panel h-fit p-5">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Morning Brief</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Your operator queue for today</p>
        </div>
        <button
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Brief controls"
        >
          <ListChecks className="size-4" />
        </button>
      </div>

      <div className="py-5">
        <p className="text-base font-semibold text-foreground">Good morning, Kabeer.</p>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening today.</p>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {briefItems.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.label} className="flex items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
              </span>
              <span className="text-sm font-semibold text-foreground">{item.value}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function DashboardMetricCard({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "attention";
}) {
  const iconClassName =
    tone === "attention"
      ? "bg-primary/10 text-primary"
      : "bg-signal-blue-soft text-signal-blue dark:bg-accent dark:text-accent-foreground";

  return (
    <div className="operator-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex size-9 items-center justify-center rounded-md ${iconClassName}`}>
          {icon}
        </div>
        <span className="text-3xl font-semibold leading-none text-foreground">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function AssistantChatPanel() {
  const [messages, setMessages] = useState<DashboardChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = chatInput.trim();
    if (!message || chatLoading) {
      return;
    }

    const history = messages.map(({ role, content }) => ({ role, content }));
    const userMessage: DashboardChatMessage = {
      id: createChatMessageId("user"),
      role: "user",
      content: message,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setChatInput("");
    setChatError(null);
    setChatLoading(true);

    try {
      const result = await sendAssistantMessage({ message, history });
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createChatMessageId("assistant"),
          role: "assistant",
          content: result.message,
          steps: result.steps,
        },
      ]);
    } catch (error: unknown) {
      setChatError(apiErrorMessage(error, "Assistant failed to respond"));
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <Card className="operator-panel p-0">
      <CardHeader className="border-b border-border bg-muted/45 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Bot className="size-4 text-primary" />
              Assistant
            </CardTitle>
            <p className="text-sm text-muted-foreground">Ready to help</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Summarize my day", "Reschedule conflicts", "Draft investor update"].map(
              (action) => (
                <button
                  key={action}
                  type="button"
                  className="h-8 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:border-primary/50"
                >
                  {action}
                </button>
              ),
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        <MessageScrollerProvider autoScroll defaultScrollPosition="end" scrollPreviousItemPeek={64}>
          <MessageScroller className="h-[240px] rounded-md border border-border bg-background">
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {messages.length === 0 ? (
                  <MessageScrollerItem messageId="assistant-empty">
                    <AssistantEmptyMessage />
                  </MessageScrollerItem>
                ) : null}
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <AssistantMessageBubble message={message} />
                  </MessageScrollerItem>
                ))}
                {chatLoading ? (
                  <MessageScrollerItem messageId="assistant-loading">
                    <div className="flex justify-start">
                      <div className="flex max-w-[85%] items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                        <RefreshCw className="size-3.5 animate-spin" />
                        Thinking
                      </div>
                    </div>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
          <textarea
            aria-label="Assistant message"
            className="min-h-12 resize-none rounded-md border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
            placeholder="Message Kabeer OS"
            value={chatInput}
            onChange={(event) => setChatInput(event.currentTarget.value)}
            disabled={chatLoading}
          />
          <Button
            type="submit"
            disabled={chatLoading || chatInput.trim().length === 0}
            className="h-12 rounded-md bg-primary px-4 text-primary-foreground shadow-none hover:bg-primary/90"
          >
            <SendHorizontal className="size-4" data-icon="inline-start" />
            Send
          </Button>
        </form>

        {chatError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <XCircle className="size-4" />
            {chatError}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AssistantEmptyMessage() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        What do you want to check?
      </div>
    </div>
  );
}

function AssistantMessageBubble({ message }: { message: DashboardChatMessage }) {
  const isUser = message.role === "user";
  const capabilitySteps =
    message.steps?.filter((step) => step.decision.type === "call_capability") ?? [];

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            : "max-w-[85%] rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
        }
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {!isUser && capabilitySteps.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {capabilitySteps.map((step) =>
              step.decision.type === "call_capability" ? (
                <span
                  key={`${message.id}-${step.index}`}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {step.decision.capability}
                </span>
              ) : null,
            )}
          </div>
        ) : null}
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
    <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
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
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/10 p-12 text-center text-muted-foreground">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
        <Sparkles className="size-5" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function DailySummaryPanel({ summary }: { summary: GitHubDailySummaryResult }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-lg font-semibold text-foreground">{summary.headline}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary.summary}</p>
      </div>

      {summary.bullets.length ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {summary.bullets.map((bullet) => (
            <li key={bullet} className="py-3 text-sm leading-6 text-foreground">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
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
    <section className="mb-2 overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/30">
      <div 
        className="flex cursor-pointer flex-col gap-3 border-b border-border bg-muted/45 p-5 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-semibold text-foreground">{project.repo}</p>
            {project.newActivityCount > 0 ? <NewBadge /> : null}
            <span className="text-xs text-muted-foreground">
              Latest {formatDateTime(project.latestAt)}
            </span>
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">{projectStats(project)}</p>
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
            <ExternalLink className="size-4 text-muted-foreground hover:text-foreground" />
          </a>
          <button className="p-2 text-muted-foreground transition-colors hover:text-foreground">
            <ChevronDown className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-4 p-6">
          {project.sections.map((section) => (
            <section key={section.key} className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/45 px-5 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-normal text-foreground">
                    {section.label}
                  </p>
                  {section.newActivityCount > 0 ? <NewBadge /> : null}
                </div>
                <span className="text-xs text-muted-foreground">
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
    <li className="border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/55">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground">
            <ActivityTypeIcon type={activity.type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                {activityLabels[activity.type]}
              </span>
              {isNew ? <NewBadge /> : null}
              <span className="text-xs text-muted-foreground">
                {formatDateTime(activity.createdAt)}
              </span>
            </div>
            <p className="mt-2 break-words text-sm font-semibold text-foreground">{activity.title}</p>
            <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{activity.summary}</p>
            {commits.length ? <CommitList commits={commits} /> : null}
          </div>
        </div>

        {activity.url ? (
          <a
            className={buttonVariants({ variant: "ghost", size: "icon-xs", className: "shrink-0 opacity-50 transition-opacity hover:opacity-100 text-muted-foreground hover:text-foreground" })}
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
  return (
    <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-primary">
      New
    </span>
  );
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
    <section className="mb-2 overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/30">
      <div 
        className="flex cursor-pointer items-center justify-between gap-3 border-b border-border bg-muted/45 px-5 py-4 transition-colors hover:bg-muted"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {repo}
          </p>
          <span className="text-xs font-medium text-primary">
            {pluralize(items.length, "item")}
          </span>
        </div>
        <button className="p-2 text-muted-foreground transition-colors hover:text-foreground">
          <ChevronDown className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      
      {isExpanded && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 border-b border-border p-5 transition-colors last:border-b-0 hover:bg-muted/55">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                <AttentionIcon kind={item.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {attentionKindLabels[item.kind]}
                  </span>
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{item.summary}</p>
              </div>
              <a
                className={buttonVariants({ variant: "ghost", size: "icon-xs", className: "shrink-0 opacity-50 transition-opacity hover:opacity-100 text-muted-foreground hover:text-foreground" })}
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
