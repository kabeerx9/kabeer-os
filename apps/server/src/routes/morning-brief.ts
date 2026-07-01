import { morningBriefSchema } from "@app-starter/contracts/morning-brief";
import type { FastifyInstance } from "fastify";

import {
  defaultMorningBriefService,
  type MorningBriefService,
} from "@/services/morning-brief";

export type MorningBriefRouteDeps = {
  service: MorningBriefService;
};

const defaultDeps: MorningBriefRouteDeps = {
  service: defaultMorningBriefService,
};

export async function registerMorningBriefRoutes(
  fastify: FastifyInstance,
  deps: Partial<MorningBriefRouteDeps> = {},
) {
  const { service } = { ...defaultDeps, ...deps };

  fastify.get("/api/morning-brief", async () => {
    const brief = await service.getMorningBrief();
    return morningBriefSchema.parse(brief);
  });
}
