import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  githubAttentionInputSchema,
  githubAttentionResultSchema,
  githubDailySummaryInputSchema,
  githubDailySummaryResultSchema,
  githubIssueSearchInputSchema,
  githubIssueSearchResultSchema,
  githubRepositorySearchInputSchema,
  githubRepositorySearchResultSchema,
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

describe("githubRepositorySearchSchema", () => {
  it("defaults repository search limit", () => {
    assert.deepEqual(githubRepositorySearchInputSchema.parse({ query: "kabeer-os" }), {
      query: "kabeer-os",
      limit: 10,
    });
  });

  it("accepts repository search results", () => {
    const result = {
      searchedAt: "2026-07-02T10:00:00.000Z",
      query: "kabeer-os",
      repositories: [
        {
          name: "kabeer/kabeer-os",
          description: "Personal OS",
          url: "https://github.com/kabeer/kabeer-os",
          private: true,
          updatedAt: "2026-07-02T09:00:00.000Z",
        },
      ],
    };

    assert.deepEqual(githubRepositorySearchResultSchema.parse(result), result);
  });
});

describe("githubIssueSearchSchema", () => {
  it("defaults issue search filters", () => {
    assert.deepEqual(githubIssueSearchInputSchema.parse({ repository: "kabeer/kabeer-os" }), {
      repository: "kabeer/kabeer-os",
      assignee: "me",
      state: "open",
      limit: 20,
    });
  });

  it("accepts issue search results", () => {
    const result = {
      searchedAt: "2026-07-02T10:00:00.000Z",
      repository: "kabeer/kabeer-os",
      issues: [
        {
          id: "github:issue:12",
          repo: "kabeer/kabeer-os",
          number: 3,
          title: "Wire assistant chat",
          state: "open",
          url: "https://github.com/kabeer/kabeer-os/issues/3",
          createdAt: "2026-07-02T08:00:00.000Z",
          updatedAt: "2026-07-02T09:00:00.000Z",
          author: "kabeer",
          labels: ["frontend"],
          metadata: {
            subjectType: "issue",
          },
        },
      ],
    };

    assert.deepEqual(githubIssueSearchResultSchema.parse(result), result);
  });

  it("rejects invalid assignee values", () => {
    assert.throws(() =>
      githubIssueSearchInputSchema.parse({
        repository: "kabeer/kabeer-os",
        assignee: "bad assignee",
      }),
    );
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

describe("githubDailySummarySchema", () => {
  const sync = {
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
    workItems: [],
    recommendedActions: [],
  };

  const attention = {
    syncedAt: "2026-07-02T10:00:00.000Z",
    username: "kabeer",
    repositories: ["kabeer/kabeer-os"],
    items: [],
  };

  it("accepts normalized summary input", () => {
    assert.deepEqual(
      githubDailySummaryInputSchema.parse({
        sync,
        newActivityIds: ["github:event:123"],
        attention,
      }),
      {
        sync,
        newActivityIds: ["github:event:123"],
        attention,
      },
    );
  });

  it("defaults empty summary input", () => {
    assert.deepEqual(githubDailySummaryInputSchema.parse({}), {
      sync: null,
      newActivityIds: [],
      attention: null,
    });
  });

  it("accepts a generated summary result", () => {
    const result = {
      generatedAt: "2026-07-02T10:01:00.000Z",
      window: {
        since: "2026-07-01T10:00:00.000Z",
        syncedAt: "2026-07-02T10:00:00.000Z",
      },
      headline: "You worked on kabeer/kabeer-os.",
      summary: "You pushed 2 commits in kabeer/kabeer-os. No GitHub attention items are open.",
      bullets: ["kabeer/kabeer-os: pushed 2 commits."],
      projects: [
        {
          repo: "kabeer/kabeer-os",
          latestAt: "2026-07-02T09:00:00.000Z",
          summary: "kabeer/kabeer-os: pushed 2 commits.",
          highlights: ["Update GitHub sync"],
          counts: {
            activities: 1,
            newActivities: 1,
            pushes: 1,
            commits: 2,
            pullRequests: 0,
            issues: 0,
            comments: 0,
            reviews: 0,
            releases: 0,
            branchChanges: 0,
            other: 0,
          },
        },
      ],
      attention: {
        summary: "No GitHub attention items are open.",
        total: 0,
        reviewRequests: 0,
        assigned: 0,
        mentions: 0,
        failedWorkflows: 0,
      },
      empty: false,
    };

    assert.deepEqual(githubDailySummaryResultSchema.parse(result), result);
  });
});
