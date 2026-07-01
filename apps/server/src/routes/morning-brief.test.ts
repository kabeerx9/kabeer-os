import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify from "fastify";

import { registerMorningBriefRoutes } from "./morning-brief";

const sampleBrief = {
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
      source: "github" as const,
      kind: "review_request" as const,
      title: "Review requested on kabeer-os#24",
      summary: "A dashboard cleanup PR is waiting for your review.",
      url: "https://github.com/kabeer/kabeer-os/pull/24",
      priority: "medium" as const,
      createdAt: "2026-07-01T15:00:00.000Z",
      updatedAt: "2026-07-02T02:45:00.000Z",
      metadata: {
        repo: "kabeer/kabeer-os",
        number: 24,
      },
    },
    {
      id: "github:issue:kabeer-os:18",
      source: "github" as const,
      kind: "assigned_issue" as const,
      title: "Issue assigned: wire dashboard to morning brief",
      summary: "Build the first useful dashboard view from the morning brief API.",
      url: "https://github.com/kabeer/kabeer-os/issues/18",
      priority: "medium" as const,
      createdAt: "2026-07-01T09:20:00.000Z",
      updatedAt: "2026-07-01T17:10:00.000Z",
      metadata: {
        repo: "kabeer/kabeer-os",
        number: 18,
      },
    },
    {
      id: "github:workflow:kabeer-os:ci:983",
      source: "github" as const,
      kind: "failed_workflow" as const,
      title: "CI failed on main",
      summary: "The latest main branch workflow failed during the typecheck step.",
      url: "https://github.com/kabeer/kabeer-os/actions/runs/983",
      priority: "high" as const,
      createdAt: "2026-07-02T01:10:00.000Z",
      updatedAt: "2026-07-02T01:16:00.000Z",
      metadata: {
        repo: "kabeer/kabeer-os",
        workflow: "CI",
      },
    },
  ],
  recommendedActions: [
    {
      id: "action:open-failed-workflow",
      workItemId: "github:workflow:kabeer-os:ci:983",
      label: "Inspect failed CI",
      reason: "A failing main branch blocks confidence in the next changes.",
      actionType: "open_url" as const,
    },
    {
      id: "action:draft-dashboard-task",
      workItemId: "github:issue:kabeer-os:18",
      label: "Draft Codex task for dashboard",
      reason: "The dashboard can be built now that the mock API shape exists.",
      actionType: "start_codex_task" as const,
    },
  ],
};

function createTestApp() {
  const fastify = Fastify();
  fastify.register(registerMorningBriefRoutes, {
    service: {
      getMorningBrief: async () => sampleBrief,
    },
  });
  return fastify;
}

describe("morning-brief routes", () => {
  it("returns a mocked morning brief", async () => {
    const app = createTestApp();

    const response = await app.inject({ method: "GET", url: "/api/morning-brief" });
    const payload = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(payload.summary.totalWorkItems, 3);
    assert.equal(payload.workItems.length, 3);
    assert.equal(payload.recommendedActions.length, 2);
    assert.equal(
      payload.workItems.some((item: { kind: string }) => item.kind === "review_request"),
      true,
    );
    assert.equal(
      payload.workItems.some((item: { kind: string }) => item.kind === "assigned_issue"),
      true,
    );
    assert.equal(
      payload.workItems.some((item: { kind: string }) => item.kind === "failed_workflow"),
      true,
    );
  });
});
