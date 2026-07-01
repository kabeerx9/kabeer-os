import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CapabilityNotExecutableError,
  createCapabilityRegistry,
} from "./registry";

const sampleBrief = {
  generatedAt: "2026-07-02T03:30:00.000Z",
  summary: {
    title: "3 GitHub items need attention",
    description: "You have one review request, one assigned issue, and one failed workflow.",
    totalWorkItems: 3,
    highPriorityCount: 1,
  },
  workItems: [],
  recommendedActions: [],
};

describe("capability registry", () => {
  it("lists capabilities with approval metadata", () => {
    const registry = createCapabilityRegistry({
      githubProvider: {
        syncActivity: async () => {
          throw new Error("Not used");
        },
      },
      morningBriefService: {
        getMorningBrief: async () => sampleBrief,
      },
    });

    const capabilities = registry.listCapabilities().capabilities;
    const githubSync = capabilities.find((capability) => capability.name === "github.sync");
    const startCodexTask = capabilities.find(
      (capability) => capability.name === "codex.startTask",
    );

    assert.equal(githubSync?.risk, "read");
    assert.equal(githubSync?.requiresApproval, false);
    assert.equal(githubSync?.status, "available");
    assert.equal(startCodexTask?.approval, "required");
    assert.equal(startCodexTask?.requiresApproval, true);
  });

  it("executes the available morning brief read capability", async () => {
    const registry = createCapabilityRegistry({
      githubProvider: {
        syncActivity: async () => {
          throw new Error("Not used");
        },
      },
      morningBriefService: {
        getMorningBrief: async () => sampleBrief,
      },
    });

    assert.deepEqual(
      await registry.executeCapability("morningBrief.read", {}),
      sampleBrief,
    );
  });

  it("executes the available GitHub sync capability", async () => {
    const registry = createCapabilityRegistry({
      githubProvider: {
        syncActivity: async () => ({
          syncedAt: "2026-07-02T10:00:00.000Z",
          since: "2026-07-01T10:00:00.000Z",
          username: "kabeer",
          activities: [],
          workItems: [],
          recommendedActions: [],
        }),
      },
      morningBriefService: {
        getMorningBrief: async () => sampleBrief,
      },
    });

    assert.deepEqual(await registry.executeCapability("github.sync", {}), {
      syncedAt: "2026-07-02T10:00:00.000Z",
      since: "2026-07-01T10:00:00.000Z",
      username: "kabeer",
      activities: [],
      workItems: [],
      recommendedActions: [],
    });
  });

  it("does not execute planned capabilities", async () => {
    const registry = createCapabilityRegistry();

    await assert.rejects(
      () => registry.executeCapability("codex.startTask", {}),
      CapabilityNotExecutableError,
    );
  });
});
