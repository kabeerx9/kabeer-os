import { z } from "zod";

import { capabilityNameSchema } from "./capabilities";

export const assistantMessageRoleSchema = z.enum(["user", "assistant"]);

export const assistantMessageSchema = z
  .object({
    role: assistantMessageRoleSchema,
    content: z.string().min(1),
  })
  .strict();

export const assistantChatInputSchema = z
  .object({
    message: z.string().trim().min(1),
    history: z.array(assistantMessageSchema).default([]),
  })
  .strict();

export const assistantDecisionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("respond"),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("call_capability"),
      capability: capabilityNameSchema,
      input: z.unknown(),
    })
    .strict(),
  z
    .object({
      type: z.literal("ask_user"),
      question: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("stop"),
      reason: z.string().min(1),
    })
    .strict(),
]);

export const assistantObservationSchema = z
  .object({
    capability: capabilityNameSchema,
    success: z.boolean(),
    result: z.unknown().optional(),
    error: z.string().optional(),
  })
  .strict();

export const assistantStepSchema = z
  .object({
    index: z.number().int().min(1),
    decision: assistantDecisionSchema,
    observation: assistantObservationSchema.optional(),
  })
  .strict();

export const assistantStoppedReasonSchema = z.enum([
  "responded",
  "asked_user",
  "stopped",
  "max_steps",
  "error",
]);

export const assistantChatResultSchema = z
  .object({
    message: z.string().min(1),
    steps: z.array(assistantStepSchema),
    stoppedReason: assistantStoppedReasonSchema,
  })
  .strict();

export type AssistantMessageRole = z.infer<typeof assistantMessageRoleSchema>;
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type AssistantChatInput = z.input<typeof assistantChatInputSchema>;
export type AssistantDecision = z.infer<typeof assistantDecisionSchema>;
export type AssistantObservation = z.infer<typeof assistantObservationSchema>;
export type AssistantStep = z.infer<typeof assistantStepSchema>;
export type AssistantStoppedReason = z.infer<typeof assistantStoppedReasonSchema>;
export type AssistantChatResult = z.infer<typeof assistantChatResultSchema>;
