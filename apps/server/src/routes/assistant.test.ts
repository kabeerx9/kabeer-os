import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AssistantChatInput } from "@app-starter/contracts/assistant";
import Fastify from "fastify";

import { registerAssistantRoutes } from "./assistant";

describe("assistant routes", () => {
  it("runs assistant chat through the orchestrator", async () => {
    const app = Fastify();
    app.register(registerAssistantRoutes, {
      orchestrator: {
        chat: async (input: AssistantChatInput) => {
          assert.deepEqual(input, {
            message: "What did I do?",
            history: [],
          });

          return {
            message: "You worked on GitHub.",
            stoppedReason: "responded",
            steps: [
              {
                index: 1,
                decision: {
                  type: "respond",
                  message: "You worked on GitHub.",
                },
              },
            ],
          };
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/assistant/chat",
      payload: {
        message: "What did I do?",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      message: "You worked on GitHub.",
      stoppedReason: "responded",
      steps: [
        {
          index: 1,
          decision: {
            type: "respond",
            message: "You worked on GitHub.",
          },
        },
      ],
    });
  });

  it("rejects invalid chat input", async () => {
    const app = Fastify();
    app.register(registerAssistantRoutes, {
      orchestrator: {
        chat: async () => {
          throw new Error("Not used");
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/assistant/chat",
      payload: {
        message: "",
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(typeof response.json().error, "string");
  });
});
