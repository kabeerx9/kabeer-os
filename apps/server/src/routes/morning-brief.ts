import { morningBriefSchema } from "@app-starter/contracts/morning-brief";
import type { FastifyInstance } from "fastify";

import {
  defaultCapabilityRegistry,
  type CapabilityRegistry,
} from "@/capabilities/registry";

export type MorningBriefRouteDeps = {
  registry: Pick<CapabilityRegistry, "executeCapability">;
};

const defaultDeps: MorningBriefRouteDeps = {
  registry: defaultCapabilityRegistry,
};

export async function registerMorningBriefRoutes(
  fastify: FastifyInstance,
  deps: Partial<MorningBriefRouteDeps> = {},
) {
  const { registry } = { ...defaultDeps, ...deps };

  fastify.get("/api/morning-brief", async () => {
    const brief = await registry.executeCapability("morningBrief.read", {});
    return morningBriefSchema.parse(brief);
  });
}
