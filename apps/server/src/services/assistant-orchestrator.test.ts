import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CapabilityName } from "@app-starter/contracts/capabilities";

import { createCapabilityRegistry } from "@/capabilities/registry";
import type { ModelProvider } from "@/providers/model";

import { createAssistantOrchestrator } from "./assistant-orchestrator";

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

function createDecisionProvider(decisions: unknown[]): ModelProvider {
  let index = 0;

  return {
    generateStructured: async () => {
      const decision = decisions[index];
      index += 1;

      if (!decision) {
        throw new Error("No decision configured");
      }

      return decision;
    },
  };
}

function createTestRegistry() {
  return createCapabilityRegistry({
    githubProvider: {
      syncActivity: async () => ({
        syncedAt: "2026-07-02T10:00:00.000Z",
        since: "2026-07-01T10:00:00.000Z",
        username: "kabeer",
        activities: [],
        workItems: [],
        recommendedActions: [],
      }),
      syncAttention: async (input) => ({
        syncedAt: "2026-07-02T10:00:00.000Z",
        username: "kabeer",
        repositories: input.repositories,
        items: [],
      }),
      searchRepositories: async (input) => ({
        searchedAt: "2026-07-02T10:00:00.000Z",
        query: input.query,
        repositories: [
          {
            name: "kabeer/kabeer-os",
            description: "Personal OS",
            url: "https://github.com/kabeer/kabeer-os",
            private: true,
            updatedAt: "2026-07-02T09:00:00.000Z",
          },
        ],
      }),
      searchIssues: async (input) => ({
        searchedAt: "2026-07-02T10:00:00.000Z",
        repository: input.repository,
        issues: [
          {
            id: "github:issue:12",
            repo: input.repository,
            number: 3,
            title: "Wire assistant chat",
            state: "open",
            url: "https://github.com/kabeer/kabeer-os/issues/3",
            createdAt: "2026-07-02T08:00:00.000Z",
            updatedAt: "2026-07-02T09:00:00.000Z",
            labels: [],
            metadata: {
              subjectType: "issue",
            },
          },
        ],
      }),
    },
    githubDailySummaryService: {
      generate: async () => ({
        generatedAt: "2026-07-02T10:01:00.000Z",
        window: null,
        headline: "No GitHub activity found in this window.",
        summary: "No GitHub attention items are open.",
        bullets: [],
        projects: [],
        attention: {
          summary: "No GitHub attention items are open.",
          total: 0,
          reviewRequests: 0,
          assigned: 0,
          mentions: 0,
          failedWorkflows: 0,
        },
        empty: true,
      }),
    },
    morningBriefService: {
      getMorningBrief: async () => sampleBrief,
    },
  });
}

describe("assistant orchestrator", () => {
  it("loops over a capability call and then responds", async () => {
    const orchestrator = createAssistantOrchestrator({
      registry: createTestRegistry(),
      modelProvider: createDecisionProvider([
        {
          type: "call_capability",
          capability: "morningBrief.read",
          input: {},
        },
        {
          type: "respond",
          message: "You have 3 GitHub items needing attention.",
        },
      ]),
      allowedCapabilities: ["morningBrief.read"],
    });

    const result = await orchestrator.chat({
      message: "What needs attention?",
    });

    assert.equal(result.stoppedReason, "responded");
    assert.equal(result.message, "You have 3 GitHub items needing attention.");
    assert.equal(result.steps.length, 2);
    assert.equal(result.steps[0]?.observation?.success, true);
  });

  it("can chain repository search into issue search", async () => {
    const orchestrator = createAssistantOrchestrator({
      registry: createTestRegistry(),
      modelProvider: createDecisionProvider([
        {
          type: "call_capability",
          capability: "github.searchRepositories",
          input: {
            query: "kabeer-os",
          },
        },
        {
          type: "call_capability",
          capability: "github.searchIssues",
          input: {
            repository: "kabeer/kabeer-os",
            assignee: "me",
            state: "open",
          },
        },
        {
          type: "respond",
          message: "You have one open assigned issue in kabeer/kabeer-os.",
        },
      ]),
      allowedCapabilities: ["github.searchRepositories", "github.searchIssues"],
    });

    const result = await orchestrator.chat({
      message: "What issues are there in kabeer-os for me?",
    });

    assert.equal(result.stoppedReason, "responded");
    assert.equal(result.message, "You have one open assigned issue in kabeer/kabeer-os.");
    assert.equal(result.steps.length, 3);
    assert.equal(result.steps[0]?.decision.type, "call_capability");
    assert.equal(result.steps[1]?.decision.type, "call_capability");
    assert.equal(result.steps[1]?.observation?.success, true);
  });

  it("rejects capability calls outside the assistant allowlist", async () => {
    const orchestrator = createAssistantOrchestrator({
      registry: createTestRegistry(),
      modelProvider: createDecisionProvider([
        {
          type: "call_capability",
          capability: "codex.startTask",
          input: {},
        },
      ]),
      allowedCapabilities: ["morningBrief.read"],
    });

    const result = await orchestrator.chat({
      message: "Start a task",
    });

    assert.equal(result.stoppedReason, "error");
    assert.match(result.message, /not allowed/);
    assert.equal(result.steps[0]?.observation?.success, false);
  });

  it("stops cleanly when the model asks the user for clarification", async () => {
    const orchestrator = createAssistantOrchestrator({
      registry: createTestRegistry(),
      modelProvider: createDecisionProvider([
        {
          type: "ask_user",
          question: "Which repository do you mean?",
        },
      ]),
    });

    const result = await orchestrator.chat({
      message: "Show me sfs issues",
    });

    assert.equal(result.stoppedReason, "asked_user");
    assert.equal(result.message, "Which repository do you mean?");
  });

  it("stops at the max step limit", async () => {
    const repeatedDecision = {
      type: "call_capability",
      capability: "morningBrief.read" satisfies CapabilityName,
      input: {},
    };
    const orchestrator = createAssistantOrchestrator({
      registry: createTestRegistry(),
      modelProvider: createDecisionProvider([
        repeatedDecision,
        repeatedDecision,
        repeatedDecision,
      ]),
      allowedCapabilities: ["morningBrief.read"],
      maxSteps: 2,
    });

    const result = await orchestrator.chat({
      message: "Keep checking",
    });

    assert.equal(result.stoppedReason, "max_steps");
    assert.equal(result.steps.length, 2);
  });
});
