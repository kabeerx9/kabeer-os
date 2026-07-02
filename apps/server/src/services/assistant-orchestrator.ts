import {
  assistantChatInputSchema,
  assistantChatResultSchema,
  assistantDecisionSchema,
  type AssistantChatInput,
  type AssistantChatResult,
  type AssistantDecision,
  type AssistantObservation,
  type AssistantStep,
} from "@app-starter/contracts/assistant";
import {
  capabilityNameSchema,
  type Capability,
  type CapabilityName,
} from "@app-starter/contracts/capabilities";

import {
  defaultCapabilityRegistry,
  type CapabilityRegistry,
} from "@/capabilities/registry";
import {
  type ModelMessage,
  type ModelProvider,
  ModelProviderError,
} from "@/providers/model";
import { defaultModelProvider } from "@/providers/openrouter-model";

export type AssistantOrchestratorOptions = {
  modelProvider?: ModelProvider;
  registry?: Pick<CapabilityRegistry, "getCapability" | "executeCapability" | "listCapabilities">;
  allowedCapabilities?: CapabilityName[];
  maxSteps?: number;
  maxObservationChars?: number;
};

export type AssistantOrchestrator = ReturnType<typeof createAssistantOrchestrator>;

const defaultAllowedCapabilities: CapabilityName[] = [
  "morningBrief.read",
  "github.sync",
  "github.attentionSync",
  "github.searchRepositories",
  "github.searchIssues",
  "github.dailySummary.generate",
];

const assistantDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "message", "capability", "input", "question", "reason"],
  properties: {
    type: {
      enum: ["respond", "call_capability", "ask_user", "stop"],
      description: "The next assistant action.",
    },
    message: {
      type: ["string", "null"],
      description: "Final answer when type is respond.",
    },
    capability: {
      enum: [...capabilityNameSchema.options, null],
      description: "Capability name when type is call_capability.",
    },
    input: {
      type: "object",
      description: "Input object for the selected capability. Never leave this empty when required fields are known.",
      additionalProperties: false,
      required: [
        "query",
        "repository",
        "repositories",
        "assignee",
        "state",
        "limit",
        "lookbackHours",
        "since",
      ],
      properties: {
        query: {
          type: ["string", "null"],
          description:
            "Repository name fragment for github.searchRepositories, or optional issue search terms for github.searchIssues.",
        },
        repository: {
          type: ["string", "null"],
          description: "Full GitHub repository name like owner/repo for github.searchIssues.",
        },
        repositories: {
          type: ["array", "null"],
          items: {
            type: "string",
          },
          description: "Repository names for github.attentionSync.",
        },
        assignee: {
          type: ["string", "null"],
          description: "GitHub assignee username, or me for the authenticated user.",
        },
        state: {
          enum: ["open", "closed", "all", null],
          description: "Issue state for github.searchIssues.",
        },
        limit: {
          type: ["integer", "null"],
          description: "Maximum number of results.",
        },
        lookbackHours: {
          type: ["integer", "null"],
          description: "Lookback window for github.sync.",
        },
        since: {
          type: ["string", "null"],
          description: "ISO datetime lower bound for github.sync.",
        },
      },
    },
    question: {
      type: ["string", "null"],
      description: "Clarifying question when type is ask_user.",
    },
    reason: {
      type: ["string", "null"],
      description: "Stop reason when type is stop.",
    },
  },
} satisfies Record<string, unknown>;

function capabilityPrompt(capabilities: Capability[]) {
  return capabilities
    .map(
      (capability) =>
        `- ${capability.name}: ${capability.description} Risk: ${capability.risk}. Approval: ${capability.approval}. Input schema: ${capability.inputSchemaName}.`,
    )
    .join("\n");
}

function systemPrompt(capabilities: Capability[]) {
  return `You are the Kabeer OS assistant.

You can only act by returning one valid JSON decision that matches the provided schema.
For type "respond", include "message".
For type "call_capability", include "capability" and "input".
For type "ask_user", include "question".
For type "stop", include "reason".
Set unused top-level fields to null. Set unused input fields to null.
You cannot run shell commands.
You cannot invent capability outputs.
If you need data, call one available capability.
If a capability call fails because input is invalid, correct the input and try again if the answer is still possible.
If names are ambiguous, ask the user.
Use the smallest number of capability calls that can answer the question.
Prefer read-only capabilities.
Do not request write capabilities unless the user clearly asks for an action.

Available capabilities:
${capabilityPrompt(capabilities)}

Useful input notes:
- morningBrief.read input is {}.
- github.sync input can be {} or { "lookbackHours": 24 }.
- github.attentionSync input can be {} or { "repositories": ["owner/repo"] }.
- github.searchRepositories input is { "query": "repo-name-or-fragment", "limit": 10 }.
- github.searchIssues input is { "repository": "owner/repo", "assignee": "me", "state": "open", "query": "optional terms", "limit": 20 }.
- If the user gives a repo name without an owner, call github.searchRepositories with the repo fragment in "query". For example, "kabeer-os" means { "query": "kabeer-os", "limit": 10 }.
- Never call github.searchRepositories with {}.
- github.dailySummary.generate needs normalized GitHub sync and attention data. Use it only if prior observations include those objects.`;
}

function truncateUnknown(value: unknown, maxChars: number): unknown {
  const json = JSON.stringify(value);

  if (json.length <= maxChars) {
    return value;
  }

  return {
    truncated: true,
    preview: json.slice(0, maxChars),
  };
}

function observationMessage(observation: AssistantObservation) {
  return `Observation:\n${JSON.stringify(observation)}`;
}

function decisionMessage(decision: AssistantDecision) {
  return `Decision:\n${JSON.stringify(decision)}`;
}

function compactInput(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([entryKey, entryValue]) => {
      if (entryValue === null || entryValue === undefined) {
        return [];
      }

      if (typeof entryValue === "string") {
        const trimmedValue = entryValue.trim();
        return trimmedValue.length > 0 ? [[entryKey, trimmedValue]] : [];
      }

      return [[entryKey, entryValue]];
    }),
  );
}

function normalizeAssistantDecision(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  switch (record.type) {
    case "respond":
      return {
        type: "respond",
        message: record.message,
      };
    case "call_capability":
      return {
        type: "call_capability",
        capability: record.capability,
        input: compactInput(record.input),
      };
    case "ask_user":
      return {
        type: "ask_user",
        question: record.question,
      };
    case "stop":
      return {
        type: "stop",
        reason: record.reason,
      };
    default:
      return value;
  }
}

function outputForError(
  message: string,
  steps: AssistantStep[],
): AssistantChatResult {
  return assistantChatResultSchema.parse({
    message,
    steps,
    stoppedReason: "error",
  });
}

export function createAssistantOrchestrator(
  options: AssistantOrchestratorOptions = {},
) {
  const modelProvider = options.modelProvider ?? defaultModelProvider;
  const registry = options.registry ?? defaultCapabilityRegistry;
  const allowedCapabilities = new Set(
    options.allowedCapabilities ?? defaultAllowedCapabilities,
  );
  const maxSteps = options.maxSteps ?? 5;
  const maxObservationChars = options.maxObservationChars ?? 6000;

  function visibleCapabilities() {
    return registry
      .listCapabilities()
      .capabilities.filter(
        (capability) =>
          allowedCapabilities.has(capability.name) && capability.status === "available",
      );
  }

  async function executeDecision(
    decision: AssistantDecision,
  ): Promise<AssistantObservation> {
    if (decision.type !== "call_capability") {
      throw new Error("Cannot execute a non-capability assistant decision.");
    }

    if (!allowedCapabilities.has(decision.capability)) {
      return {
        capability: decision.capability,
        success: false,
        error: `Capability is not allowed in assistant chat: ${decision.capability}`,
      };
    }

    const capability = registry.getCapability(decision.capability);
    if (capability.requiresApproval) {
      return {
        capability: decision.capability,
        success: false,
        error: `Capability requires approval and cannot run directly from chat: ${decision.capability}`,
      };
    }

    try {
      const result = await registry.executeCapability(decision.capability, decision.input);
      return {
        capability: decision.capability,
        success: true,
        result: truncateUnknown(result, maxObservationChars),
      };
    } catch (error) {
      return {
        capability: decision.capability,
        success: false,
        error: error instanceof Error ? error.message : "Capability execution failed.",
      };
    }
  }

  return {
    async chat(rawInput: AssistantChatInput): Promise<AssistantChatResult> {
      const input = assistantChatInputSchema.parse(rawInput);
      const steps: AssistantStep[] = [];
      let lastObservationError: string | undefined;
      const messages: ModelMessage[] = [
        {
          role: "system",
          content: systemPrompt(visibleCapabilities()),
        },
        ...input.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: "user",
          content: input.message,
        },
      ];

      for (let index = 1; index <= maxSteps; index += 1) {
        let decision: AssistantDecision;

        try {
          decision = assistantDecisionSchema.parse(
            normalizeAssistantDecision(
              await modelProvider.generateStructured({
                messages,
                schemaName: "assistant_decision",
                jsonSchema: assistantDecisionJsonSchema,
              }),
            ),
          );
        } catch (error) {
          return outputForError(
            error instanceof ModelProviderError
              ? error.message
              : lastObservationError ?? "Assistant model returned an invalid decision.",
            steps,
          );
        }

        if (decision.type === "respond") {
          steps.push({ index, decision });
          return assistantChatResultSchema.parse({
            message: decision.message,
            steps,
            stoppedReason: "responded",
          });
        }

        if (decision.type === "ask_user") {
          steps.push({ index, decision });
          return assistantChatResultSchema.parse({
            message: decision.question,
            steps,
            stoppedReason: "asked_user",
          });
        }

        if (decision.type === "stop") {
          steps.push({ index, decision });
          return assistantChatResultSchema.parse({
            message: decision.reason,
            steps,
            stoppedReason: "stopped",
          });
        }

        const observation = await executeDecision(decision);
        steps.push({ index, decision, observation });
        lastObservationError = observation.success ? undefined : observation.error;
        messages.push({
          role: "assistant",
          content: decisionMessage(decision),
        });
        messages.push({
          role: "user",
          content: observationMessage(observation),
        });
      }

      if (lastObservationError) {
        return outputForError(lastObservationError, steps);
      }

      return assistantChatResultSchema.parse({
        message: "I gathered some information, but I hit the step limit before finishing.",
        steps,
        stoppedReason: "max_steps",
      });
    },
  };
}

export const defaultAssistantOrchestrator = createAssistantOrchestrator();
