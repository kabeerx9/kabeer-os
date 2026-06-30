import { z } from "zod";

const trimmedNameSchema = z.string().trim().min(1, "Name is required").max(100, "Name is too long");

const optionalDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description is too long")
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export const exampleProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const exampleProjectListSchema = z.array(exampleProjectSchema);

export const createExampleProjectInputSchema = z.object({
  name: trimmedNameSchema,
  description: optionalDescriptionSchema,
});

export const updateExampleProjectInputSchema = z
  .object({
    name: trimmedNameSchema.optional(),
    description: optionalDescriptionSchema,
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field must be provided",
  });

export const exampleProjectIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type ExampleProject = z.infer<typeof exampleProjectSchema>;
export type ExampleProjectList = z.infer<typeof exampleProjectListSchema>;
export type CreateExampleProjectInput = z.infer<typeof createExampleProjectInputSchema>;
export type UpdateExampleProjectInput = z.infer<typeof updateExampleProjectInputSchema>;
export type ExampleProjectIdParams = z.infer<typeof exampleProjectIdParamsSchema>;
