import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assistantChatInputSchema,
  assistantChatResultSchema,
  assistantDecisionSchema,
} from "./assistant.ts";

describe("assistantChatInputSchema", () => {
  it("accepts a user message and defaults history", () => {
    assert.deepEqual(assistantChatInputSchema.parse({ message: "What did I do?" }), {
      message: "What did I do?",
      history: [],
    });
  });

  it("rejects empty messages", () => {
    assert.throws(() => assistantChatInputSchema.parse({ message: " " }));
  });
});

describe("assistantDecisionSchema", () => {
  it("accepts a response decision", () => {
    const decision = {
      type: "respond",
      message: "You worked on GitHub sync.",
    };

    assert.deepEqual(assistantDecisionSchema.parse(decision), decision);
  });

  it("accepts a capability call decision", () => {
    const decision = {
      type: "call_capability",
      capability: "github.sync",
      input: {
        lookbackHours: 24,
      },
    };

    assert.deepEqual(assistantDecisionSchema.parse(decision), decision);
  });

  it("rejects unsupported capabilities", () => {
    assert.throws(() =>
      assistantDecisionSchema.parse({
        type: "call_capability",
        capability: "shell.run",
        input: {},
      }),
    );
  });
});

describe("assistantChatResultSchema", () => {
  it("accepts an inspectable chat result", () => {
    const result = {
      message: "You have recent GitHub activity.",
      stoppedReason: "responded",
      steps: [
        {
          index: 1,
          decision: {
            type: "call_capability",
            capability: "github.sync",
            input: {},
          },
          observation: {
            capability: "github.sync",
            success: true,
            result: {
              activities: [],
            },
          },
        },
        {
          index: 2,
          decision: {
            type: "respond",
            message: "You have recent GitHub activity.",
          },
        },
      ],
    };

    assert.deepEqual(assistantChatResultSchema.parse(result), result);
  });
});
