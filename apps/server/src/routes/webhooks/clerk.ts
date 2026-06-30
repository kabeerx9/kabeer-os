import { verifyWebhook } from "@clerk/fastify/webhooks";
import type { UserJSON } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";

import {
  deleteUserByClerkId,
  mapClerkUser,
  upsertUserFromClerk,
} from "@/services/user";

export async function registerClerkWebhookRoutes(fastify: FastifyInstance) {
  fastify.post("/webhooks/clerk", async (request, reply) => {
    let event;

    try {
      event = await verifyWebhook(request);
    } catch (error) {
      request.log.error({ err: error }, "Clerk webhook verification failed");
      return reply.code(400).send({ error: "Invalid webhook signature" });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        await upsertUserFromClerk(mapClerkUser(event.data as UserJSON));
        break;
      }
      case "user.deleted": {
        const clerkId = (event.data as { id?: string }).id;
        if (clerkId) {
          await deleteUserByClerkId(clerkId);
        }
        break;
      }
      default:
        request.log.info({ type: event.type }, "Unhandled Clerk webhook event");
    }

    return reply.send({ ok: true });
  });
}
