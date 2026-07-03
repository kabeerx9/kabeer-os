import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
    CORS_ORIGIN: z.url(),
    MODEL_PROVIDER: z.enum(["openrouter", "openai", "local"]).default("openrouter"),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().min(1).default("openai/gpt-4.1-mini"),
    OPENROUTER_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_TRANSCRIPTION_MODEL: z.string().min(1).default("gpt-4o-mini-transcribe"),
    OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
