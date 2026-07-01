import { capabilityListSchema } from "@app-starter/contracts/capabilities";
import type { FastifyInstance } from "fastify";

import {
  defaultCapabilityRegistry,
  type CapabilityRegistry,
} from "@/capabilities/registry";

export type CapabilitiesRouteDeps = {
  registry: Pick<CapabilityRegistry, "listCapabilities">;
};

const defaultDeps: CapabilitiesRouteDeps = {
  registry: defaultCapabilityRegistry,
};

export async function registerCapabilitiesRoutes(
  fastify: FastifyInstance,
  deps: Partial<CapabilitiesRouteDeps> = {},
) {
  const { registry } = { ...defaultDeps, ...deps };

  fastify.get("/api/capabilities", async () => {
    return capabilityListSchema.parse(registry.listCapabilities());
  });
}
