import {
  assistantChatInputSchema,
  assistantChatResultSchema,
} from "@app-starter/contracts/assistant";
import type { FastifyInstance } from "fastify";

import {
  defaultAssistantOrchestrator,
  type AssistantOrchestrator,
} from "@/services/assistant-orchestrator";

export type AssistantRouteDeps = {
  orchestrator: Pick<AssistantOrchestrator, "chat">;
};

const defaultDeps: AssistantRouteDeps = {
  orchestrator: defaultAssistantOrchestrator,
};

function invalidInputMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function registerAssistantRoutes(
  fastify: FastifyInstance,
  deps: Partial<AssistantRouteDeps> = {},
) {
  const { orchestrator } = { ...defaultDeps, ...deps };

  fastify.post("/api/assistant/chat", async (request, reply) => {
    const input = assistantChatInputSchema.safeParse(request.body ?? {});

    if (!input.success) {
      return reply.code(400).send({ error: invalidInputMessage(input.error) });
    }

    const result = await orchestrator.chat(input.data);
    return assistantChatResultSchema.parse(result);
  });
}
