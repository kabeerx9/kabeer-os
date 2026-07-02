import {
  ApiError,
  assistantChatInputSchema,
  assistantChatResultSchema,
  createApiClient,
  createExampleProjectInputSchema,
  deleteAccountInputSchema,
  exampleProjectListSchema,
  exampleProjectSchema,
  githubAttentionInputSchema,
  githubAttentionResultSchema,
  githubDailySummaryInputSchema,
  githubDailySummaryResultSchema,
  githubSyncInputSchema,
  githubSyncSnapshotSchema,
  meResponseSchema,
  morningBriefSchema,
  updateAccountInputSchema,
  updateExampleProjectInputSchema,
  type AssistantChatInput,
  type AssistantChatResult,
  type AssistantMessage,
  type AssistantStep,
  type CreateExampleProjectInput,
  type DeleteAccountInput,
  type ExampleProject,
  type GitHubActivity,
  type GitHubAttentionInput,
  type GitHubAttentionItem,
  type GitHubAttentionResult,
  type GitHubDailySummaryInput,
  type GitHubDailySummaryResult,
  type GitHubSyncInput,
  type GitHubSyncResult,
  type GitHubSyncSnapshot,
  type MorningBrief,
  type MeResponse,
  type RecommendedAction,
  type UpdateAccountInput,
  type UpdateExampleProjectInput,
  type WorkItem,
} from "@app-starter/contracts";
import { env } from "@app-starter/env/web";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export type {
  AssistantChatInput,
  AssistantChatResult,
  AssistantMessage,
  AssistantStep,
  CreateExampleProjectInput,
  DeleteAccountInput,
  ExampleProject,
  GitHubActivity,
  GitHubAttentionInput,
  GitHubAttentionItem,
  GitHubAttentionResult,
  GitHubDailySummaryInput,
  GitHubDailySummaryResult,
  GitHubSyncInput,
  GitHubSyncResult,
  GitHubSyncSnapshot,
  MorningBrief,
  MeResponse,
  RecommendedAction,
  UpdateAccountInput,
  UpdateExampleProjectInput,
  WorkItem,
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

export function getMorningBrief() {
  return api.requestJson("/api/morning-brief", morningBriefSchema);
}

export function sendAssistantMessage(input: AssistantChatInput) {
  const body = assistantChatInputSchema.parse(input);
  return api.requestJson("/api/assistant/chat", assistantChatResultSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getLatestGitHubSync() {
  return api.requestJson("/api/github/sync/latest", githubSyncSnapshotSchema);
}

export function syncGitHub(input: Partial<GitHubSyncInput> = {}) {
  const body = githubSyncInputSchema.parse(input);
  return api.requestJson("/api/github/sync", githubSyncSnapshotSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function syncGitHubAttention(input: Partial<GitHubAttentionInput> = {}) {
  const body = githubAttentionInputSchema.parse(input);
  return api.requestJson("/api/github/attention/sync", githubAttentionResultSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function generateGitHubDailySummary(input: Partial<GitHubDailySummaryInput> = {}) {
  const body = githubDailySummaryInputSchema.parse(input);
  return api.requestJson("/api/github/daily-summary", githubDailySummaryResultSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
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
