import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify from "fastify";

import {
  VoiceTranscriptionProviderError,
  type VoiceTranscriptionRequest,
} from "@/providers/voice-transcription";

import { registerVoiceRoutes } from "./voice";

describe("voice routes", () => {
  it("transcribes voice audio through the provider", async () => {
    const app = Fastify();
    app.register(registerVoiceRoutes, {
      transcriptionProvider: {
        transcribe: async (input: VoiceTranscriptionRequest) => {
          assert.equal(input.audioBase64, "dm9pY2U=");
          assert.equal(input.mimeType, "audio/webm");
          return { text: "What did I do yesterday?" };
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/voice/transcribe",
      payload: {
        audioBase64: "dm9pY2U=",
        mimeType: "audio/webm",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      text: "What did I do yesterday?",
    });
  });

  it("rejects invalid transcription input", async () => {
    const app = Fastify();
    app.register(registerVoiceRoutes, {
      transcriptionProvider: {
        transcribe: async () => {
          throw new Error("Not used");
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/voice/transcribe",
      payload: {
        audioBase64: "",
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(typeof response.json().error, "string");
  });

  it("returns provider errors", async () => {
    const app = Fastify();
    app.register(registerVoiceRoutes, {
      transcriptionProvider: {
        transcribe: async () => {
          throw new VoiceTranscriptionProviderError("OPENAI_API_KEY is required.", 503);
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/voice/transcribe",
      payload: {
        audioBase64: "dm9pY2U=",
        mimeType: "audio/webm",
      },
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), {
      error: "OPENAI_API_KEY is required.",
    });
  });
});
