import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ModelProviderError } from "./model";
import { createOpenRouterModelProvider } from "./openrouter-model";

describe("createOpenRouterModelProvider", () => {
  it("posts structured output requests to OpenRouter", async () => {
    let requestBody: unknown;
    const provider = createOpenRouterModelProvider({
      apiKey: "test-key",
      model: "test/model",
      baseUrl: "https://openrouter.test/api/v1",
      fetchImpl: async (url, init) => {
        assert.equal(url, "https://openrouter.test/api/v1/chat/completions");
        assert.equal(init?.method, "POST");
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-key");
        requestBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    type: "respond",
                    message: "Done",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      },
    });

    const result = await provider.generateStructured({
      schemaName: "assistant_decision",
      jsonSchema: {
        type: "object",
        properties: {},
      },
      messages: [
        {
          role: "user",
          content: "Hi",
        },
      ],
    });

    assert.deepEqual(result, {
      type: "respond",
      message: "Done",
    });
    assert.deepEqual(requestBody, {
      model: "test/model",
      messages: [
        {
          role: "user",
          content: "Hi",
        },
      ],
      provider: {
        require_parameters: true,
      },
      max_tokens: 1200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "assistant_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {},
          },
        },
      },
    });
  });

  it("requires an API key", async () => {
    const provider = createOpenRouterModelProvider({
      apiKey: "",
      fetchImpl: async () => new Response("not used"),
    });

    await assert.rejects(
      () =>
        provider.generateStructured({
          schemaName: "assistant_decision",
          jsonSchema: {},
          messages: [],
        }),
      ModelProviderError,
    );
  });
});
