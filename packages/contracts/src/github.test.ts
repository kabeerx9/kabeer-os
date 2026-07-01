import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { githubSyncInputSchema, githubSyncResultSchema } from "./github.ts";

describe("githubSyncInputSchema", () => {
  it("defaults to a 24 hour lookback", () => {
    assert.deepEqual(githubSyncInputSchema.parse({}), { lookbackHours: 24 });
  });

  it("accepts an explicit since datetime", () => {
    assert.deepEqual(
      githubSyncInputSchema.parse({
        since: "2026-07-01T10:00:00.000Z",
      }),
      {
        lookbackHours: 24,
        since: "2026-07-01T10:00:00.000Z",
      },
    );
  });

  it("rejects excessive lookback windows", () => {
    assert.throws(() => githubSyncInputSchema.parse({ lookbackHours: 169 }));
  });
});

describe("githubSyncResultSchema", () => {
  const validResult = {
    syncedAt: "2026-07-02T10:00:00.000Z",
    since: "2026-07-01T10:00:00.000Z",
    username: "kabeer",
    activities: [
      {
        id: "github:event:123",
        type: "push",
        action: "pushed",
        repo: "kabeer/kabeer-os",
        title: "Pushed 2 commits to kabeer/kabeer-os",
        summary: "Updated main with 2 commits.",
        url: "https://github.com/kabeer/kabeer-os",
        createdAt: "2026-07-02T09:00:00.000Z",
        metadata: {
          branch: "main",
          commitCount: 2,
        },
      },
    ],
    workItems: [
      {
        id: "github:activity:123",
        source: "github",
        kind: "github_activity",
        title: "Pushed 2 commits to kabeer/kabeer-os",
        summary: "Updated main with 2 commits.",
        url: "https://github.com/kabeer/kabeer-os",
        priority: "low",
        createdAt: "2026-07-02T09:00:00.000Z",
        updatedAt: "2026-07-02T09:00:00.000Z",
        metadata: {
          activityType: "push",
        },
      },
    ],
    recommendedActions: [],
  };

  it("accepts a valid sync result", () => {
    assert.deepEqual(githubSyncResultSchema.parse(validResult), validResult);
  });

  it("rejects unsupported activity types", () => {
    assert.throws(() =>
      githubSyncResultSchema.parse({
        ...validResult,
        activities: [
          {
            ...validResult.activities[0],
            type: "workflow_run",
          },
        ],
      }),
    );
  });
});
