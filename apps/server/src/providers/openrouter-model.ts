import { z } from "zod";

import {
  type GenerateStructuredInput,
  type ModelProvider,
  ModelProviderError,
} from "./model";

export type OpenRouterModelProviderOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const openRouterChatCompletionSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().nullable(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getOpenRouterConfig(options: OpenRouterModelProviderOptions) {
  return {
    apiKey: options.apiKey ?? process.env.OPENROUTER_API_KEY,
    model: options.model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
    baseUrl:
      options.baseUrl ??
      process.env.OPENROUTER_BASE_URL ??
      "https://openrouter.ai/api/v1",
  };
}

export function createOpenRouterModelProvider(
  options: OpenRouterModelProviderOptions = {},
): ModelProvider {
  const fetchFn = options.fetchImpl ?? fetch;

  return {
    async generateStructured(input: GenerateStructuredInput) {
      const config = getOpenRouterConfig(options);

      if (!config.apiKey) {
        throw new ModelProviderError("OPENROUTER_API_KEY is required for assistant chat.");
      }

      const body = {
        model: config.model,
        messages: input.messages,
        provider: {
          require_parameters: true,
        },
        max_tokens: input.maxTokens ?? 1200,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.schemaName,
            strict: true,
            schema: input.jsonSchema,
          },
        },
        ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      };

      const response = await fetchFn(`${trimTrailingSlash(config.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Kabeer OS",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new ModelProviderError(
          `OpenRouter request failed with ${response.status}: ${errorBody || response.statusText}`,
        );
      }

      const payload = openRouterChatCompletionSchema.safeParse(await response.json());
      if (!payload.success) {
        throw new ModelProviderError("OpenRouter returned an invalid chat completion payload.");
      }

      const content = payload.data.choices[0]?.message.content;
      if (!content) {
        throw new ModelProviderError("OpenRouter returned an empty structured response.");
      }

      try {
        return JSON.parse(content) as unknown;
      } catch (error) {
        throw new ModelProviderError("OpenRouter returned invalid JSON content.", {
          cause: error,
        });
      }
    },
  };
}

export const defaultModelProvider = createOpenRouterModelProvider();
