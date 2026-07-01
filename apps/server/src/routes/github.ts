import {
  githubSyncInputSchema,
  githubSyncResultSchema,
} from "@app-starter/contracts/github";
import type { FastifyInstance } from "fastify";

import {
  defaultCapabilityRegistry,
  type CapabilityRegistry,
} from "@/capabilities/registry";
import { GitHubProviderError } from "@/providers/github";

export type GitHubRouteDeps = {
  registry: Pick<CapabilityRegistry, "executeCapability">;
};

const defaultDeps: GitHubRouteDeps = {
  registry: defaultCapabilityRegistry,
};

function invalidInputMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function registerGitHubRoutes(
  fastify: FastifyInstance,
  deps: Partial<GitHubRouteDeps> = {},
) {
  const { registry } = { ...defaultDeps, ...deps };

  fastify.post("/api/github/sync", async (request, reply) => {
    const input = githubSyncInputSchema.safeParse(request.body ?? {});

    if (!input.success) {
      return reply.code(400).send({ error: invalidInputMessage(input.error) });
    }

    try {
      const result = await registry.executeCapability("github.sync", input.data);
      return githubSyncResultSchema.parse(result);
    } catch (error) {
      if (error instanceof GitHubProviderError) {
        return reply.code(502).send({ error: error.message });
      }

      throw error;
    }
  });
}
