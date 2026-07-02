import {
  githubDailySummaryInputSchema,
  githubDailySummaryResultSchema,
  type GitHubActivity,
  type GitHubAttentionResult,
  type GitHubDailySummaryCounts,
  type GitHubDailySummaryInput,
  type GitHubDailySummaryProject,
  type GitHubDailySummaryResult,
} from "@app-starter/contracts/github";

export type GitHubDailySummaryService = {
  generate: (input: GitHubDailySummaryInput) => Promise<GitHubDailySummaryResult>;
};

export type GitHubDailySummaryServiceOptions = {
  now?: () => Date;
};

type ProjectAccumulator = {
  repo: string;
  latestAt: string;
  highlights: string[];
  highlightKeys: Set<string>;
  counts: GitHubDailySummaryCounts;
};

type CommitMetadata = {
  message?: string;
};

const maxProjectHighlights = 3;
const maxSummaryProjects = 3;

function emptyCounts(): GitHubDailySummaryCounts {
  return {
    activities: 0,
    newActivities: 0,
    pushes: 0,
    commits: 0,
    pullRequests: 0,
    issues: 0,
    comments: 0,
    reviews: 0,
    releases: 0,
    branchChanges: 0,
    other: 0,
  };
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function joinWithAnd(parts: string[]) {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function firstLine(value: string) {
  return value.split(/\r?\n/, 1)[0]?.trim() ?? value.trim();
}

function cleanHighlight(value: string) {
  const cleaned = firstLine(value).replace(/\s+/g, " ").trim();

  if (cleaned.length <= 96) {
    return cleaned;
  }

  return `${cleaned.slice(0, 95).trimEnd()}...`;
}

function getNumberMetadataValue(activity: GitHubActivity, key: string) {
  const value = activity.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getCommitMetadata(activity: GitHubActivity): CommitMetadata[] {
  const commits = activity.metadata["commits"];

  if (!Array.isArray(commits)) {
    return [];
  }

  return commits.flatMap((commit) => {
    if (!commit || typeof commit !== "object" || Array.isArray(commit)) {
      return [];
    }

    const message = (commit as Record<string, unknown>)["message"];
    return typeof message === "string" && message.trim().length > 0
      ? [{ message: message.trim() }]
      : [];
  });
}

function commitCount(activity: GitHubActivity) {
  return getNumberMetadataValue(activity, "commitCount") ?? getCommitMetadata(activity).length;
}

function updateCounts(counts: GitHubDailySummaryCounts, activity: GitHubActivity) {
  counts.activities += 1;

  switch (activity.type) {
    case "push":
      counts.pushes += 1;
      counts.commits += commitCount(activity);
      break;
    case "pull_request":
      counts.pullRequests += 1;
      break;
    case "issue":
      counts.issues += 1;
      break;
    case "issue_comment":
    case "pull_request_review_comment":
    case "commit_comment":
      counts.comments += 1;
      break;
    case "pull_request_review":
      counts.reviews += 1;
      break;
    case "release":
      counts.releases += 1;
      break;
    case "create":
    case "delete":
      counts.branchChanges += 1;
      break;
    default:
      counts.other += 1;
      break;
  }
}

function addCounts(target: GitHubDailySummaryCounts, source: GitHubDailySummaryCounts) {
  target.activities += source.activities;
  target.newActivities += source.newActivities;
  target.pushes += source.pushes;
  target.commits += source.commits;
  target.pullRequests += source.pullRequests;
  target.issues += source.issues;
  target.comments += source.comments;
  target.reviews += source.reviews;
  target.releases += source.releases;
  target.branchChanges += source.branchChanges;
  target.other += source.other;
}

function actionParts(counts: GitHubDailySummaryCounts) {
  const parts = [
    counts.commits > 0 ? `pushed ${pluralize(counts.commits, "commit")}` : null,
    counts.pullRequests > 0
      ? `worked on ${pluralize(counts.pullRequests, "pull request event")}`
      : null,
    counts.issues > 0 ? `handled ${pluralize(counts.issues, "issue event")}` : null,
    counts.reviews > 0 ? `logged ${pluralize(counts.reviews, "review event")}` : null,
    counts.comments > 0 ? `left ${pluralize(counts.comments, "comment")}` : null,
    counts.releases > 0 ? `published ${pluralize(counts.releases, "release")}` : null,
    counts.branchChanges > 0
      ? `changed ${pluralize(counts.branchChanges, "branch or tag", "branches or tags")}`
      : null,
    counts.other > 0 ? `logged ${pluralize(counts.other, "other activity", "other activities")}` : null,
  ];

  return parts.filter((part): part is string => Boolean(part));
}

function projectScore(project: ProjectAccumulator | GitHubDailySummaryProject) {
  const counts = project.counts;
  return (
    counts.commits +
    counts.pullRequests * 3 +
    counts.issues * 2 +
    counts.reviews * 2 +
    counts.comments +
    counts.releases * 3 +
    counts.branchChanges +
    counts.other
  );
}

function activityHighlights(activity: GitHubActivity) {
  if (activity.type === "push") {
    const commits = getCommitMetadata(activity).flatMap((commit) =>
      commit.message ? [commit.message] : [],
    );

    if (commits.length) {
      return commits;
    }
  }

  return [activity.title];
}

function addHighlights(project: ProjectAccumulator, activity: GitHubActivity) {
  if (project.highlights.length >= maxProjectHighlights) {
    return;
  }

  for (const rawHighlight of activityHighlights(activity)) {
    const highlight = cleanHighlight(rawHighlight);
    const key = highlight.toLowerCase();

    if (!highlight || project.highlightKeys.has(key)) {
      continue;
    }

    project.highlightKeys.add(key);
    project.highlights.push(highlight);

    if (project.highlights.length >= maxProjectHighlights) {
      return;
    }
  }
}

function summarizeProject(project: ProjectAccumulator): GitHubDailySummaryProject {
  const parts = actionParts(project.counts);
  const activityText = parts.length
    ? joinWithAnd(parts)
    : `logged ${pluralize(project.counts.activities, "activity", "activities")}`;
  const newText =
    project.counts.newActivities > 0
      ? ` ${pluralize(project.counts.newActivities, "item")} was new since the previous sync.`
      : "";
  const highlightText = project.highlights.length
    ? ` Key work: ${joinWithAnd(project.highlights)}.`
    : "";

  return {
    repo: project.repo,
    latestAt: project.latestAt,
    summary: `${project.repo}: ${activityText}.${newText}${highlightText}`,
    highlights: project.highlights,
    counts: project.counts,
  };
}

function attentionSummary(attention: GitHubAttentionResult | null) {
  const items = attention?.items ?? [];
  const reviewRequests = items.filter((item) => item.kind === "review_request").length;
  const assigned = items.filter((item) => item.kind === "assigned").length;
  const mentions = items.filter((item) => item.kind === "mention").length;
  const failedWorkflows = items.filter((item) => item.kind === "failed_workflow").length;
  const total = items.length;

  if (total === 0) {
    return {
      summary: "No GitHub attention items are open.",
      total,
      reviewRequests,
      assigned,
      mentions,
      failedWorkflows,
    };
  }

  const parts = [
    reviewRequests > 0 ? pluralize(reviewRequests, "review request") : null,
    assigned > 0 ? pluralize(assigned, "assigned item") : null,
    mentions > 0 ? pluralize(mentions, "mention") : null,
    failedWorkflows > 0 ? pluralize(failedWorkflows, "failed workflow") : null,
  ].filter((part): part is string => Boolean(part));

  return {
    summary: `${pluralize(total, "open attention item")}: ${joinWithAnd(parts)}.`,
    total,
    reviewRequests,
    assigned,
    mentions,
    failedWorkflows,
  };
}

function projectSummaries(input: GitHubDailySummaryInput) {
  const sync = input.sync;

  if (!sync || sync.activities.length === 0) {
    return [];
  }

  const newActivityIds = new Set(input.newActivityIds);
  const projects = new Map<string, ProjectAccumulator>();

  for (const activity of sync.activities) {
    let project = projects.get(activity.repo);

    if (!project) {
      project = {
        repo: activity.repo,
        latestAt: activity.createdAt,
        highlights: [],
        highlightKeys: new Set(),
        counts: emptyCounts(),
      };
      projects.set(activity.repo, project);
    }

    updateCounts(project.counts, activity);

    if (newActivityIds.has(activity.id)) {
      project.counts.newActivities += 1;
    }

    if (new Date(activity.createdAt).getTime() > new Date(project.latestAt).getTime()) {
      project.latestAt = activity.createdAt;
    }

    addHighlights(project, activity);
  }

  return [...projects.values()]
    .sort((a, b) => projectScore(b) - projectScore(a))
    .map(summarizeProject);
}

function headline(projects: GitHubDailySummaryProject[], attentionTotal: number) {
  if (projects.length === 0) {
    return attentionTotal > 0
      ? "No GitHub activity in this window, but attention items are open."
      : "No GitHub activity found in this window.";
  }

  const topProject = projects[0];
  if (!topProject) {
    return "No GitHub activity found in this window.";
  }

  if (projects.length === 1) {
    return `You worked on ${topProject.repo}.`;
  }

  return `You worked across ${pluralize(projects.length, "project")}, led by ${topProject.repo}.`;
}

function mainSummary(
  projects: GitHubDailySummaryProject[],
  totalCounts: GitHubDailySummaryCounts,
  attentionText: string,
) {
  if (projects.length === 0) {
    return attentionText;
  }

  const topProject = projects[0];
  if (!topProject) {
    return attentionText;
  }

  const parts = actionParts(totalCounts).slice(0, 4);
  const activityText = parts.length
    ? joinWithAnd(parts)
    : `logged ${pluralize(totalCounts.activities, "activity", "activities")}`;
  const projectText =
    projects.length === 1
      ? ` in ${topProject.repo}`
      : ` across ${pluralize(projects.length, "project")}, mostly in ${topProject.repo}`;

  return `You ${activityText}${projectText}. ${attentionText}`;
}

export function createDeterministicGitHubDailySummaryService(
  options: GitHubDailySummaryServiceOptions = {},
): GitHubDailySummaryService {
  const now = options.now ?? (() => new Date());

  return {
    async generate(rawInput) {
      const input = githubDailySummaryInputSchema.parse(rawInput);
      const projects = projectSummaries(input);
      const totals = emptyCounts();

      for (const project of projects) {
        addCounts(totals, project.counts);
      }

      const attention = attentionSummary(input.attention);
      const bullets = [
        ...projects.slice(0, maxSummaryProjects).map((project) => project.summary),
        ...(attention.total > 0 ? [attention.summary] : []),
      ];

      return githubDailySummaryResultSchema.parse({
        generatedAt: now().toISOString(),
        window: input.sync
          ? {
              since: input.sync.since,
              syncedAt: input.sync.syncedAt,
            }
          : null,
        headline: headline(projects, attention.total),
        summary: mainSummary(projects, totals, attention.summary),
        bullets,
        projects,
        attention,
        empty: projects.length === 0 && attention.total === 0,
      });
    },
  };
}

export const defaultGitHubDailySummaryService =
  createDeterministicGitHubDailySummaryService();
