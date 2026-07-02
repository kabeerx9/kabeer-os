import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  GitHubAttentionResult,
  GitHubSyncResult,
} from "@app-starter/contracts/github";

import { createDeterministicGitHubDailySummaryService } from "./github-daily-summary";

const sync: GitHubSyncResult = {
  syncedAt: "2026-07-02T10:00:00.000Z",
  since: "2026-07-01T10:00:00.000Z",
  username: "kabeer",
  activities: [
    {
      id: "github:event:1",
      type: "push",
      action: "pushed",
      repo: "kabeer/kabeer-os",
      title: "Pushed 2 commits to kabeer/kabeer-os:main",
      summary: "Updated kabeer/kabeer-os:main with 2 commits.",
      url: "https://github.com/kabeer/kabeer-os",
      createdAt: "2026-07-02T09:00:00.000Z",
      metadata: {
        branch: "main",
        commitCount: 2,
        commits: [
          {
            message: "Add GitHub attention summary",
          },
          {
            message: "Wire dashboard activity groups",
          },
        ],
      },
    },
    {
      id: "github:event:2",
      type: "issue_comment",
      action: "commented",
      repo: "kabeer/kabeer-os",
      title: "Commented on issue #3",
      summary: "Commented on issue #3 in kabeer/kabeer-os.",
      url: "https://github.com/kabeer/kabeer-os/issues/3",
      createdAt: "2026-07-02T09:30:00.000Z",
      metadata: {},
    },
  ],
  workItems: [],
  recommendedActions: [],
};

const attention: GitHubAttentionResult = {
  syncedAt: "2026-07-02T10:00:00.000Z",
  username: "kabeer",
  repositories: ["kabeer/kabeer-os"],
  items: [
    {
      id: "github:attention:assigned:3",
      kind: "assigned",
      repo: "kabeer/kabeer-os",
      title: "Finish GitHub summary",
      summary: "Assigned issue #3 in kabeer/kabeer-os.",
      url: "https://github.com/kabeer/kabeer-os/issues/3",
      createdAt: "2026-07-02T09:00:00.000Z",
      updatedAt: "2026-07-02T09:30:00.000Z",
      metadata: {},
    },
  ],
};

describe("deterministic GitHub daily summary service", () => {
  it("summarizes activity and attention without model calls", async () => {
    const service = createDeterministicGitHubDailySummaryService({
      now: () => new Date("2026-07-02T10:01:00.000Z"),
    });

    const result = await service.generate({
      sync,
      newActivityIds: ["github:event:2"],
      attention,
    });

    assert.equal(result.generatedAt, "2026-07-02T10:01:00.000Z");
    assert.equal(result.headline, "You worked on kabeer/kabeer-os.");
    assert.match(result.summary, /pushed 2 commits/);
    assert.match(result.summary, /left 1 comment/);
    assert.match(result.summary, /1 open attention item/);
    assert.equal(result.projects[0]?.counts.newActivities, 1);
    assert.deepEqual(result.projects[0]?.highlights, [
      "Add GitHub attention summary",
      "Wire dashboard activity groups",
      "Commented on issue #3",
    ]);
  });

  it("returns an empty summary when no GitHub data is available", async () => {
    const service = createDeterministicGitHubDailySummaryService({
      now: () => new Date("2026-07-02T10:01:00.000Z"),
    });

    const result = await service.generate({
      sync: null,
      newActivityIds: [],
      attention: null,
    });

    assert.equal(result.empty, true);
    assert.equal(result.projects.length, 0);
    assert.equal(result.attention.total, 0);
  });
});
