import {
  capabilityListSchema,
  type Capability,
  type CapabilityApproval,
  type CapabilityList,
  type CapabilityName,
  type CapabilityRisk,
  type CapabilityStatus,
} from "@app-starter/contracts/capabilities";
import {
  githubAttentionInputSchema,
  githubAttentionResultSchema,
  githubDailySummaryInputSchema,
  githubDailySummaryResultSchema,
  githubSyncInputSchema,
  githubSyncResultSchema,
} from "@app-starter/contracts/github";
import { morningBriefSchema } from "@app-starter/contracts/morning-brief";
import { z, type ZodType } from "zod";

import {
  defaultGitHubProvider,
  type GitHubProvider,
} from "@/providers/github";
import {
  defaultMorningBriefService,
  type MorningBriefService,
} from "@/services/morning-brief";
import {
  defaultGitHubDailySummaryService,
  type GitHubDailySummaryService,
} from "@/services/github-daily-summary";

export type CapabilityExecutionContext = {
  githubProvider: GitHubProvider;
  githubDailySummaryService: GitHubDailySummaryService;
  morningBriefService: MorningBriefService;
};

export type CapabilityDefinition<TInput = unknown, TOutput = unknown> = {
  name: CapabilityName;
  description: string;
  risk: CapabilityRisk;
  approval: CapabilityApproval;
  status: CapabilityStatus;
  inputSchemaName: string;
  outputSchemaName: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  tags: string[];
  execute?: (input: TInput, context: CapabilityExecutionContext) => Promise<TOutput>;
};

export class CapabilityNotFoundError extends Error {
  constructor(name: string) {
    super(`Capability not found: ${name}`);
    this.name = "CapabilityNotFoundError";
  }
}

export class CapabilityNotExecutableError extends Error {
  constructor(name: string) {
    super(`Capability is not executable yet: ${name}`);
    this.name = "CapabilityNotExecutableError";
  }
}

export class CapabilityApprovalRequiredError extends Error {
  constructor(name: string) {
    super(`Capability requires approval: ${name}`);
    this.name = "CapabilityApprovalRequiredError";
  }
}

export type ExecuteCapabilityOptions = {
  approved?: boolean;
};

export type CapabilityRegistry = ReturnType<typeof createCapabilityRegistry>;

const noInputSchema = z.object({}).strict();
const plannedOutputSchema = z.unknown();

const capabilityDefinitions: CapabilityDefinition[] = [
  {
    name: "morningBrief.read",
    description: "Read the current morning brief with normalized work items and recommendations.",
    risk: "read",
    approval: "none",
    status: "available",
    inputSchemaName: "empty",
    outputSchemaName: "morningBrief",
    inputSchema: noInputSchema,
    outputSchema: morningBriefSchema,
    tags: ["brief", "work-items", "read"],
    execute: async (_input, context) => context.morningBriefService.getMorningBrief(),
  },
  {
    name: "github.sync",
    description: "Fetch your read-only GitHub activity from the requested time window.",
    risk: "read",
    approval: "none",
    status: "available",
    inputSchemaName: "githubSyncInput",
    outputSchemaName: "githubSyncResult",
    inputSchema: githubSyncInputSchema,
    outputSchema: githubSyncResultSchema,
    tags: ["github", "sync", "read"],
    execute: async (input, context) =>
      context.githubProvider.syncActivity(githubSyncInputSchema.parse(input)),
  },
  {
    name: "github.attentionSync",
    description: "Fetch read-only GitHub items that need your attention.",
    risk: "read",
    approval: "none",
    status: "available",
    inputSchemaName: "githubAttentionInput",
    outputSchemaName: "githubAttentionResult",
    inputSchema: githubAttentionInputSchema,
    outputSchema: githubAttentionResultSchema,
    tags: ["github", "attention", "read"],
    execute: async (input, context) =>
      context.githubProvider.syncAttention(githubAttentionInputSchema.parse(input)),
  },
  {
    name: "github.dailySummary.generate",
    description: "Generate a deterministic daily summary from normalized GitHub activity and attention data.",
    risk: "read",
    approval: "none",
    status: "available",
    inputSchemaName: "githubDailySummaryInput",
    outputSchemaName: "githubDailySummaryResult",
    inputSchema: githubDailySummaryInputSchema,
    outputSchema: githubDailySummaryResultSchema,
    tags: ["github", "summary", "read"],
    execute: async (input, context) =>
      context.githubDailySummaryService.generate(githubDailySummaryInputSchema.parse(input)),
  },
  {
    name: "workItem.markSeen",
    description: "Mark a known work item as seen so future briefs can focus on changes.",
    risk: "write",
    approval: "none",
    status: "planned",
    inputSchemaName: "markWorkItemSeenInput",
    outputSchemaName: "workItemState",
    inputSchema: z.unknown(),
    outputSchema: plannedOutputSchema,
    tags: ["work-items", "state"],
  },
  {
    name: "url.open",
    description: "Open a known URL from a work item or recommendation.",
    risk: "read",
    approval: "none",
    status: "planned",
    inputSchemaName: "openUrlInput",
    outputSchemaName: "openUrlResult",
    inputSchema: z.unknown(),
    outputSchema: plannedOutputSchema,
    tags: ["navigation", "local"],
  },
  {
    name: "codex.draftTask",
    description: "Create a draft Codex task from a selected work item without starting it.",
    risk: "draft",
    approval: "none",
    status: "planned",
    inputSchemaName: "draftCodexTaskInput",
    outputSchemaName: "codingTask",
    inputSchema: z.unknown(),
    outputSchema: plannedOutputSchema,
    tags: ["codex", "draft"],
  },
  {
    name: "codex.startTask",
    description: "Start an approved Codex task through the coding agent provider.",
    risk: "write",
    approval: "required",
    status: "planned",
    inputSchemaName: "startCodexTaskInput",
    outputSchemaName: "agentRun",
    inputSchema: z.unknown(),
    outputSchema: plannedOutputSchema,
    tags: ["codex", "approval", "write"],
  },
];

function serializeCapability(definition: CapabilityDefinition): Capability {
  return {
    name: definition.name,
    description: definition.description,
    risk: definition.risk,
    approval: definition.approval,
    requiresApproval: definition.approval !== "none",
    status: definition.status,
    inputSchemaName: definition.inputSchemaName,
    outputSchemaName: definition.outputSchemaName,
    tags: definition.tags,
  };
}

export function createCapabilityRegistry(
  contextOverrides: Partial<CapabilityExecutionContext> = {},
) {
  const context: CapabilityExecutionContext = {
    githubProvider: defaultGitHubProvider,
    githubDailySummaryService: defaultGitHubDailySummaryService,
    morningBriefService: defaultMorningBriefService,
    ...contextOverrides,
  };

  const definitionsByName = new Map(
    capabilityDefinitions.map((definition) => [definition.name, definition]),
  );

  function getDefinition(name: CapabilityName): CapabilityDefinition {
    const definition = definitionsByName.get(name);
    if (!definition) {
      throw new CapabilityNotFoundError(name);
    }

    return definition;
  }

  return {
    listCapabilities(): CapabilityList {
      return capabilityListSchema.parse({
        capabilities: capabilityDefinitions.map(serializeCapability),
      });
    },

    getCapability(name: CapabilityName): Capability {
      return serializeCapability(getDefinition(name));
    },

    async executeCapability(
      name: CapabilityName,
      input: unknown,
      options: ExecuteCapabilityOptions = {},
    ): Promise<unknown> {
      const definition = getDefinition(name);
      if (!definition.execute || definition.status !== "available") {
        throw new CapabilityNotExecutableError(name);
      }

      if (definition.approval !== "none" && !options.approved) {
        throw new CapabilityApprovalRequiredError(name);
      }

      const parsedInput = definition.inputSchema.parse(input);
      const output = await definition.execute(parsedInput, context);
      return definition.outputSchema.parse(output);
    },
  };
}

export const defaultCapabilityRegistry = createCapabilityRegistry();
