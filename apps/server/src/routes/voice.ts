import {
  voiceTranscriptionInputSchema,
  voiceTranscriptionResultSchema,
} from "@app-starter/contracts/voice";
import type { FastifyInstance } from "fastify";

import {
  defaultVoiceTranscriptionProvider,
  VoiceTranscriptionProviderError,
  type VoiceTranscriptionProvider,
} from "@/providers/voice-transcription";

export type VoiceRouteDeps = {
  transcriptionProvider: Pick<VoiceTranscriptionProvider, "transcribe">;
};

const defaultDeps: VoiceRouteDeps = {
  transcriptionProvider: defaultVoiceTranscriptionProvider,
};

function invalidInputMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function registerVoiceRoutes(
  fastify: FastifyInstance,
  deps: Partial<VoiceRouteDeps> = {},
) {
  const { transcriptionProvider } = { ...defaultDeps, ...deps };

  fastify.post("/api/voice/transcribe", async (request, reply) => {
    const input = voiceTranscriptionInputSchema.safeParse(request.body ?? {});

    if (!input.success) {
      return reply.code(400).send({ error: invalidInputMessage(input.error) });
    }

    try {
      const result = await transcriptionProvider.transcribe(input.data);
      return voiceTranscriptionResultSchema.parse(result);
    } catch (error: unknown) {
      if (error instanceof VoiceTranscriptionProviderError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      throw error;
    }
  });
}
