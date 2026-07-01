import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CapabilityName } from "@app-starter/contracts/capabilities";
import type {
  GitHubSyncResult,
  GitHubSyncStoreState,
} from "@app-starter/contracts/github";
import Fastify from "fastify";

import { GitHubProviderError } from "@/providers/github";
import type { GitHubSyncStore } from "@/stores/github-sync-store";

import { registerGitHubRoutes } from "./github";

const sampleResult: GitHubSyncResult = {
  syncedAt: "2026-07-02T10:00:00.000Z",
  since: "2026-07-01T10:00:00.000Z",
  username: "kabeer",
  activities: [
    {
      id: "github:event:1",
      type: "push" as const,
      action: "pushed",
      repo: "kabeer/kabeer-os",
      title: "Pushed 2 commits to kabeer/kabeer-os:main",
      summary: "Updated kabeer/kabeer-os:main with 2 commits.",
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
      id: "github:activity:1",
      source: "github" as const,
      kind: "github_activity" as const,
      title: "Pushed 2 commits to kabeer/kabeer-os:main",
      summary: "Updated kabeer/kabeer-os:main with 2 commits.",
      url: "https://github.com/kabeer/kabeer-os",
      priority: "low" as const,
      createdAt: "2026-07-02T09:00:00.000Z",
      updatedAt: "2026-07-02T09:00:00.000Z",
      metadata: {
        activityType: "push",
      },
    },
  ],
  recommendedActions: [],
};

const sampleAttentionResult = {
  syncedAt: "2026-07-02T10:00:00.000Z",
  username: "kabeer",
  repositories: ["kabeer/kabeer-os"],
  items: [
    {
      id: "github:attention:review_request:1",
      kind: "review_request" as const,
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

function createMemoryStore(initialState?: Partial<GitHubSyncStoreState>): GitHubSyncStore {
  let state: GitHubSyncStoreState = {
    lastSync: null,
    seenActivityIds: [],
    lastNewActivityIds: [],
    ...initialState,
  };

  return {
    getState: async () => state,
    saveSync: async (result) => {
      const previousSeenIds = new Set(state.seenActivityIds);
      const resultActivityIds = result.activities.map((activity) => activity.id);
      state = {
        lastSync: result,
        seenActivityIds: [...new Set([...state.seenActivityIds, ...resultActivityIds])],
        lastNewActivityIds: resultActivityIds.filter((id) => !previousSeenIds.has(id)),
      };

      return state;
    },
  };
}

describe("github routes", () => {
  it("returns the latest persisted GitHub sync", async () => {
    const app = Fastify();
    app.register(registerGitHubRoutes, {
      registry: {
        executeCapability: async () => sampleResult,
      },
      syncStore: createMemoryStore({
        lastSync: sampleResult,
        seenActivityIds: ["github:event:1"],
        lastNewActivityIds: ["github:event:1"],
      }),
    });

    const response = await app.inject({ method: "GET", url: "/api/github/sync/latest" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      lastSync: sampleResult,
      seenActivityIds: ["github:event:1"],
      newActivityIds: ["github:event:1"],
    });
  });

  it("syncs GitHub activity through the capability registry", async () => {
    const app = Fastify();
    app.register(registerGitHubRoutes, {
      registry: {
        executeCapability: async (name: CapabilityName, input: unknown) => {
          assert.equal(name, "github.sync");
          assert.deepEqual(input, { lookbackHours: 24 });
          return sampleResult;
        },
      },
      syncStore: createMemoryStore(),
    });

    const response = await app.inject({ method: "POST", url: "/api/github/sync" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      lastSync: sampleResult,
      seenActivityIds: ["github:event:1"],
      newActivityIds: ["github:event:1"],
    });
  });

  it("accepts an explicit lookback window", async () => {
    const app = Fastify();
    app.register(registerGitHubRoutes, {
      registry: {
        executeCapability: async (_name: CapabilityName, input: unknown) => {
          assert.deepEqual(input, { lookbackHours: 6 });
          return sampleResult;
        },
      },
      syncStore: createMemoryStore(),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/github/sync",
      payload: { lookbackHours: 6 },
    });

    assert.equal(response.statusCode, 200);
  });

  it("rejects invalid sync input", async () => {
    const app = Fastify();
    app.register(registerGitHubRoutes, {
      registry: {
        executeCapability: async () => sampleResult,
      },
      syncStore: createMemoryStore(),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/github/sync",
      payload: { lookbackHours: 169 },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(typeof response.json().error, "string");
  });

  it("returns a clean error when GitHub provider sync fails", async () => {
    const app = Fastify();
    app.register(registerGitHubRoutes, {
      registry: {
        executeCapability: async () => {
          throw new GitHubProviderError("Failed to run GitHub CLI command.");
        },
      },
      syncStore: createMemoryStore(),
    });

    const response = await app.inject({ method: "POST", url: "/api/github/sync" });

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.json(), { error: "Failed to run GitHub CLI command." });
  });

  it("syncs GitHub attention through the capability registry with persisted repositories", async () => {
    const app = Fastify();
    app.register(registerGitHubRoutes, {
      registry: {
        executeCapability: async (name: CapabilityName, input: unknown) => {
          assert.equal(name, "github.attentionSync");
          assert.deepEqual(input, { repositories: ["kabeer/kabeer-os"] });
          return sampleAttentionResult;
        },
      },
      syncStore: createMemoryStore({
        lastSync: sampleResult,
        seenActivityIds: ["github:event:1"],
        lastNewActivityIds: [],
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/github/attention/sync",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), sampleAttentionResult);
  });

  it("accepts explicit repositories for GitHub attention sync", async () => {
    const app = Fastify();
    app.register(registerGitHubRoutes, {
      registry: {
        executeCapability: async (_name: CapabilityName, input: unknown) => {
          assert.deepEqual(input, { repositories: ["kabeer/kabeer-os"] });
          return sampleAttentionResult;
        },
      },
      syncStore: createMemoryStore(),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/github/attention/sync",
      payload: { repositories: ["kabeer/kabeer-os"] },
    });

    assert.equal(response.statusCode, 200);
  });
});
