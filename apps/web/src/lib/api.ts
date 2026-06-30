import {
  ApiError,
  createApiClient,
  createExampleProjectInputSchema,
  deleteAccountInputSchema,
  exampleProjectListSchema,
  exampleProjectSchema,
  meResponseSchema,
  updateAccountInputSchema,
  updateExampleProjectInputSchema,
  type CreateExampleProjectInput,
  type DeleteAccountInput,
  type ExampleProject,
  type MeResponse,
  type UpdateAccountInput,
  type UpdateExampleProjectInput,
} from "@app-starter/contracts";
import { env } from "@app-starter/env/web";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export type {
  CreateExampleProjectInput,
  DeleteAccountInput,
  ExampleProject,
  MeResponse,
  UpdateAccountInput,
  UpdateExampleProjectInput,
};
export { ApiError };

const api = createApiClient({
  baseUrl: env.VITE_SERVER_URL,
  getToken: getClerkAuthToken,
  credentials: "include",
});

export function getMe() {
  return api.requestJson("/api/me", meResponseSchema);
}

export function updateAccount(input: UpdateAccountInput) {
  const body = updateAccountInputSchema.parse(input);
  return api.requestJson("/api/account", meResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAccount(input: DeleteAccountInput) {
  const body = deleteAccountInputSchema.parse(input);
  return api.requestVoid("/api/account", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export function listExampleProjects() {
  return api.requestJson("/api/example-projects", exampleProjectListSchema);
}

export function createExampleProject(input: CreateExampleProjectInput) {
  const body = createExampleProjectInputSchema.parse(input);
  return api.requestJson("/api/example-projects", exampleProjectSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateExampleProject(id: string, input: UpdateExampleProjectInput) {
  const body = updateExampleProjectInputSchema.parse(input);
  return api.requestJson(`/api/example-projects/${id}`, exampleProjectSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteExampleProject(id: string) {
  return api.requestVoid(`/api/example-projects/${id}`, {
    method: "DELETE",
  });
}
