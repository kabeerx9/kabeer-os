import { z } from "zod";

const optionalNameFieldSchema = z
  .string()
  .trim()
  .max(100, "Name is too long")
  .transform((value) => (value === "" ? null : value))
  .optional();

export const updateAccountInputSchema = z
  .object({
    firstName: optionalNameFieldSchema,
    lastName: optionalNameFieldSchema,
  })
  .refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
    message: "At least one field must be provided",
  });

export const deleteAccountInputSchema = z.object({
  confirmation: z.literal("DELETE", {
    error: "Type DELETE to confirm account deletion",
  }),
});

export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
