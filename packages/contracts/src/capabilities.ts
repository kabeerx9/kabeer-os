import { z } from "zod";

export const capabilityNameSchema = z.enum([
  "morningBrief.read",
  "github.sync",
  "github.attentionSync",
  "workItem.markSeen",
  "url.open",
  "codex.draftTask",
  "codex.startTask",
]);

export const capabilityRiskSchema = z.enum(["read", "draft", "write", "destructive"]);

export const capabilityApprovalSchema = z.enum(["none", "required", "strong"]);

export const capabilityStatusSchema = z.enum(["available", "planned"]);

export const capabilitySchema = z
  .object({
    name: capabilityNameSchema,
    description: z.string().min(1),
    risk: capabilityRiskSchema,
    approval: capabilityApprovalSchema,
    requiresApproval: z.boolean(),
    status: capabilityStatusSchema,
    inputSchemaName: z.string().min(1),
    outputSchemaName: z.string().min(1),
    tags: z.array(z.string().min(1)),
  })
  .strict();

export const capabilityListSchema = z
  .object({
    capabilities: z.array(capabilitySchema),
  })
  .strict();

export type CapabilityName = z.infer<typeof capabilityNameSchema>;
export type CapabilityRisk = z.infer<typeof capabilityRiskSchema>;
export type CapabilityApproval = z.infer<typeof capabilityApprovalSchema>;
export type CapabilityStatus = z.infer<typeof capabilityStatusSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type CapabilityList = z.infer<typeof capabilityListSchema>;
