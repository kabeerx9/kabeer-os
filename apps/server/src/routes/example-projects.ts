import { clerkClient, getAuth } from "@clerk/fastify";
import {
  createExampleProjectInputSchema,
  exampleProjectIdParamsSchema,
  exampleProjectListSchema,
  exampleProjectSchema,
  updateExampleProjectInputSchema,
} from "@app-starter/contracts/example-projects";
import type { FastifyInstance, FastifyRequest } from "fastify";

import {
  defaultExampleProjectsService,
  type ExampleProjectsService,
} from "@/services/example-projects";
import { mapClerkApiUser } from "@/services/user";

export type ExampleProjectsRouteDeps = {
  getAuth: (request: FastifyRequest) => { userId: string | null | undefined };
  service: ExampleProjectsService;
  syncFromClerk: (userId: string) => Promise<ReturnType<typeof mapClerkApiUser>>;
};

const defaultDeps: ExampleProjectsRouteDeps = {
  getAuth,
  service: defaultExampleProjectsService,
  syncFromClerk: async (userId) => {
    const clerkUser = await clerkClient.users.getUser(userId);
    return mapClerkApiUser(clerkUser);
  },
};

function invalidInputMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function registerExampleProjectsRoutes(
  fastify: FastifyInstance,
  deps: Partial<ExampleProjectsRouteDeps> = {},
) {
  const { getAuth: getAuthFn, service, syncFromClerk } = { ...defaultDeps, ...deps };

  fastify.get("/api/example-projects", async (request, reply) => {
    const { userId } = getAuthFn(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const items = await service.listByClerkId(userId);
    return exampleProjectListSchema.parse(items);
  });

  fastify.post("/api/example-projects", async (request, reply) => {
    const { userId } = getAuthFn(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const parsed = createExampleProjectInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: invalidInputMessage(parsed.error) });
    }

    const project = await service.createByClerkId(userId, parsed.data, () =>
      syncFromClerk(userId),
    );

    return reply.code(201).send(exampleProjectSchema.parse(project));
  });

  fastify.patch("/api/example-projects/:id", async (request, reply) => {
    const { userId } = getAuthFn(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const params = exampleProjectIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: invalidInputMessage(params.error) });
    }

    const parsed = updateExampleProjectInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: invalidInputMessage(parsed.error) });
    }

    const project = await service.updateByClerkId(userId, params.data.id, parsed.data);
    if (!project) {
      return reply.code(404).send({ error: "Not found" });
    }

    return exampleProjectSchema.parse(project);
  });

  fastify.delete("/api/example-projects/:id", async (request, reply) => {
    const { userId } = getAuthFn(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const params = exampleProjectIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: invalidInputMessage(params.error) });
    }

    const deleted = await service.deleteByClerkId(userId, params.data.id);
    if (!deleted) {
      return reply.code(404).send({ error: "Not found" });
    }

    return reply.code(204).send();
  });
}
