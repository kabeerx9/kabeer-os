import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CapabilityName } from "@app-starter/contracts/capabilities";
import Fastify from "fastify";

import { GitHubProviderError } from "@/providers/github";

import { registerGitHubRoutes } from "./github";

const sampleResult = {
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

describe("github routes", () => {
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
    });

    const response = await app.inject({ method: "POST", url: "/api/github/sync" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), sampleResult);
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
    });

    const response = await app.inject({ method: "POST", url: "/api/github/sync" });

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.json(), { error: "Failed to run GitHub CLI command." });
  });
});
