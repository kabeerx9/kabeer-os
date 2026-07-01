import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  githubAttentionInputSchema,
  githubAttentionResultSchema,
  githubSyncInputSchema,
  githubSyncResultSchema,
  githubSyncSnapshotSchema,
  githubSyncStoreStateSchema,
} from "./github.ts";

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

describe("githubAttentionInputSchema", () => {
  it("defaults to no repository filter", () => {
    assert.deepEqual(githubAttentionInputSchema.parse({}), { repositories: [] });
  });

  it("accepts repository names", () => {
    assert.deepEqual(githubAttentionInputSchema.parse({ repositories: ["kabeer/kabeer-os"] }), {
      repositories: ["kabeer/kabeer-os"],
    });
  });

  it("rejects invalid repository names", () => {
    assert.throws(() => githubAttentionInputSchema.parse({ repositories: ["not a repo"] }));
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

  it("accepts persisted sync state", () => {
    assert.deepEqual(
      githubSyncStoreStateSchema.parse({
        lastSync: validResult,
        seenActivityIds: ["github:event:123"],
        lastNewActivityIds: ["github:event:123"],
      }),
      {
        lastSync: validResult,
        seenActivityIds: ["github:event:123"],
        lastNewActivityIds: ["github:event:123"],
      },
    );
  });

  it("accepts a dashboard sync snapshot", () => {
    assert.deepEqual(
      githubSyncSnapshotSchema.parse({
        lastSync: validResult,
        seenActivityIds: ["github:event:123"],
        newActivityIds: ["github:event:123"],
      }),
      {
        lastSync: validResult,
        seenActivityIds: ["github:event:123"],
        newActivityIds: ["github:event:123"],
      },
    );
  });
});

describe("githubAttentionResultSchema", () => {
  const validResult = {
    syncedAt: "2026-07-02T10:00:00.000Z",
    username: "kabeer",
    repositories: ["kabeer/kabeer-os"],
    items: [
      {
        id: "github:attention:review_request:1",
        kind: "review_request",
        repo: "kabeer/kabeer-os",
        title: "Review dashboard PR",
        summary: "Review requested on PR #12 in kabeer/kabeer-os.",
        url: "https://github.com/kabeer/kabeer-os/pull/12",
        createdAt: "2026-07-02T09:00:00.000Z",
        updatedAt: "2026-07-02T09:30:00.000Z",
        metadata: {
          number: 12,
        },
      },
    ],
  };

  it("accepts a valid attention result", () => {
    assert.deepEqual(githubAttentionResultSchema.parse(validResult), validResult);
  });

  it("rejects unsupported attention kinds", () => {
    assert.throws(() =>
      githubAttentionResultSchema.parse({
        ...validResult,
        items: [
          {
            ...validResult.items[0],
            kind: "todo",
          },
        ],
      }),
    );
  });
});
