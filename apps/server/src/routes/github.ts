import {
  githubSyncInputSchema,
  githubSyncResultSchema,
  githubSyncSnapshotSchema,
} from "@app-starter/contracts/github";
import type { FastifyInstance } from "fastify";

import {
  defaultCapabilityRegistry,
  type CapabilityRegistry,
} from "@/capabilities/registry";
import { GitHubProviderError } from "@/providers/github";
import {
  defaultGitHubSyncStore,
  snapshotFromGitHubSyncState,
  type GitHubSyncStore,
} from "@/stores/github-sync-store";

export type GitHubRouteDeps = {
  registry: Pick<CapabilityRegistry, "executeCapability">;
  syncStore: GitHubSyncStore;
};

const defaultDeps: GitHubRouteDeps = {
  registry: defaultCapabilityRegistry,
  syncStore: defaultGitHubSyncStore,
};

function invalidInputMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function registerGitHubRoutes(
  fastify: FastifyInstance,
  deps: Partial<GitHubRouteDeps> = {},
) {
  const { registry, syncStore } = { ...defaultDeps, ...deps };

  fastify.get("/api/github/sync/latest", async () => {
    const state = await syncStore.getState();
    return githubSyncSnapshotSchema.parse(snapshotFromGitHubSyncState(state));
  });

  fastify.post("/api/github/sync", async (request, reply) => {
    const input = githubSyncInputSchema.safeParse(request.body ?? {});

    if (!input.success) {
      return reply.code(400).send({ error: invalidInputMessage(input.error) });
    }

    try {
      const result = await registry.executeCapability("github.sync", input.data);
      const syncResult = githubSyncResultSchema.parse(result);
      const state = await syncStore.saveSync(syncResult);
      return githubSyncSnapshotSchema.parse(snapshotFromGitHubSyncState(state));
    } catch (error) {
      if (error instanceof GitHubProviderError) {
        return reply.code(502).send({ error: error.message });
      }

      throw error;
    }
  });
}
