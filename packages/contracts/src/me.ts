import { z } from "zod";

export const meResponseSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.string(),
});
