import {
  createExampleProject,
  deleteExampleProject,
  listExampleProjects,
  updateExampleProject,
  type CreateExampleProjectInput,
  type UpdateExampleProjectInput,
} from "@/lib/api";

export const exampleProjectsApi = {
  list: listExampleProjects,
  create: (input: CreateExampleProjectInput) => createExampleProject(input),
  update: (input: { id: string; data: UpdateExampleProjectInput }) =>
    updateExampleProject(input.id, input.data),
  delete: (id: string) => deleteExampleProject(id),
};
