import { clerkClient, getAuth } from "@clerk/fastify";
import {
  deleteAccountInputSchema,
  updateAccountInputSchema,
} from "@app-starter/contracts/account";
import { meResponseSchema } from "@app-starter/contracts/me";
import type { FastifyInstance, FastifyRequest } from "fastify";

import {
  deleteUserByClerkId,
  mapClerkApiUser,
  updateAccountFromClerk,
} from "@/services/user";

export type AccountRouteDeps = {
  getAuth: (request: FastifyRequest) => { userId: string | null | undefined };
  updateClerkUser: (
    userId: string,
    input: { firstName?: string | null; lastName?: string | null },
  ) => Promise<Parameters<typeof mapClerkApiUser>[0]>;
  updateAccount: typeof updateAccountFromClerk;
  deleteClerkUser: (userId: string) => Promise<void>;
  deleteLocalUser: (clerkId: string) => Promise<void>;
  logLocalCleanupFailure: (request: FastifyRequest, error: unknown) => void;
};

const defaultDeps: AccountRouteDeps = {
  getAuth,
  updateClerkUser: async (userId, input) => {
    const params: { firstName?: string; lastName?: string } = {};

    if (input.firstName !== undefined) {
      params.firstName = input.firstName ?? "";
    }

    if (input.lastName !== undefined) {
      params.lastName = input.lastName ?? "";
    }

    return clerkClient.users.updateUser(userId, params);
  },
  updateAccount: updateAccountFromClerk,
  deleteClerkUser: async (userId) => {
    await clerkClient.users.deleteUser(userId);
  },
  deleteLocalUser: deleteUserByClerkId,
  logLocalCleanupFailure: (request, error) => {
    request.log.error({ err: error }, "Local account cleanup failed after Clerk deletion");
  },
};

function invalidInputMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function registerAccountRoutes(
  fastify: FastifyInstance,
  deps: Partial<AccountRouteDeps> = {},
) {
  const {
    getAuth: getAuthFn,
    updateClerkUser,
    updateAccount,
    deleteClerkUser,
    deleteLocalUser,
    logLocalCleanupFailure,
  } = {
    ...defaultDeps,
    ...deps,
  };

  fastify.patch("/api/account", async (request, reply) => {
    const { userId } = getAuthFn(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const parsed = updateAccountInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: invalidInputMessage(parsed.error) });
    }

    try {
      const me = await updateAccount(userId, parsed.data, updateClerkUser);
      return meResponseSchema.parse(me);
    } catch (error) {
      request.log.error({ err: error }, "Failed to update account");
      return reply.code(502).send({ error: "Failed to update account" });
    }
  });

  fastify.delete("/api/account", async (request, reply) => {
    const { userId } = getAuthFn(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const parsed = deleteAccountInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: invalidInputMessage(parsed.error) });
    }

    try {
      await deleteClerkUser(userId);
    } catch (error) {
      request.log.error({ err: error }, "Failed to delete account");
      return reply.code(502).send({ error: "Failed to delete account" });
    }

    try {
      await deleteLocalUser(userId);
    } catch (error) {
      logLocalCleanupFailure(request, error);
    }

    return reply.code(204).send();
  });
}
