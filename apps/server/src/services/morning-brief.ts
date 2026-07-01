import type { MorningBrief } from "@app-starter/contracts/morning-brief";

export type MorningBriefService = {
  getMorningBrief: () => Promise<MorningBrief>;
};

const mockMorningBrief: MorningBrief = {
  generatedAt: "2026-07-02T03:30:00.000Z",
  summary: {
    title: "3 GitHub items need attention",
    description: "You have one review request, one assigned issue, and one failed workflow.",
    totalWorkItems: 3,
    highPriorityCount: 1,
  },
  workItems: [
    {
      id: "github:review:kabeer-os:24",
      source: "github",
      kind: "review_request",
      title: "Review requested on kabeer-os#24",
      summary: "A dashboard cleanup PR is waiting for your review.",
      url: "https://github.com/kabeer/kabeer-os/pull/24",
      priority: "medium",
      createdAt: "2026-07-01T15:00:00.000Z",
      updatedAt: "2026-07-02T02:45:00.000Z",
      metadata: {
        repo: "kabeer/kabeer-os",
        number: 24,
        author: "teammate",
      },
    },
    {
      id: "github:issue:kabeer-os:18",
      source: "github",
      kind: "assigned_issue",
      title: "Issue assigned: wire dashboard to morning brief",
      summary: "Build the first useful dashboard view from the morning brief API.",
      url: "https://github.com/kabeer/kabeer-os/issues/18",
      priority: "medium",
      createdAt: "2026-07-01T09:20:00.000Z",
      updatedAt: "2026-07-01T17:10:00.000Z",
      metadata: {
        repo: "kabeer/kabeer-os",
        number: 18,
        labels: ["dashboard", "v0"],
      },
    },
    {
      id: "github:workflow:kabeer-os:ci:983",
      source: "github",
      kind: "failed_workflow",
      title: "CI failed on main",
      summary: "The latest main branch workflow failed during the typecheck step.",
      url: "https://github.com/kabeer/kabeer-os/actions/runs/983",
      priority: "high",
      createdAt: "2026-07-02T01:10:00.000Z",
      updatedAt: "2026-07-02T01:16:00.000Z",
      metadata: {
        repo: "kabeer/kabeer-os",
        workflow: "CI",
        runId: "983",
        failedStep: "check-types",
      },
    },
  ],
  recommendedActions: [
    {
      id: "action:open-failed-workflow",
      workItemId: "github:workflow:kabeer-os:ci:983",
      label: "Inspect failed CI",
      reason: "A failing main branch blocks confidence in the next changes.",
      actionType: "open_url",
    },
    {
      id: "action:draft-dashboard-task",
      workItemId: "github:issue:kabeer-os:18",
      label: "Draft Codex task for dashboard",
      reason: "The dashboard can be built now that the mock API shape exists.",
      actionType: "start_codex_task",
    },
  ],
};

export const defaultMorningBriefService: MorningBriefService = {
  getMorningBrief: async () => mockMorningBrief,
};
