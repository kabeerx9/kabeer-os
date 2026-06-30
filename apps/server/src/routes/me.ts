import { getAuth, clerkClient } from "@clerk/fastify";
import { meResponseSchema } from "@app-starter/contracts/me";
import type { FastifyInstance } from "fastify";

import { getOrCreateUserByClerkId, mapClerkApiUser, serializeUser } from "@/services/user";

export async function registerMeRoutes(fastify: FastifyInstance) {
  fastify.get("/api/me", async (request, reply) => {
    const { userId } = getAuth(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = await getOrCreateUserByClerkId(userId, async () => {
      const clerkUser = await clerkClient.users.getUser(userId);
      return mapClerkApiUser(clerkUser);
    });

    return meResponseSchema.parse(serializeUser(user));
  });
}
