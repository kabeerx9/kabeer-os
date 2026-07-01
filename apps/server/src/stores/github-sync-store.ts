import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  githubSyncSnapshotSchema,
  githubSyncStoreStateSchema,
  type GitHubSyncResult,
  type GitHubSyncSnapshot,
  type GitHubSyncStoreState,
} from "@app-starter/contracts/github";

export type GitHubSyncStore = {
  getState: () => Promise<GitHubSyncStoreState>;
  saveSync: (result: GitHubSyncResult) => Promise<GitHubSyncStoreState>;
};

const defaultState: GitHubSyncStoreState = {
  lastSync: null,
  seenActivityIds: [],
  lastNewActivityIds: [],
};

const defaultStorePath = fileURLToPath(new URL("../../.data/github-sync.json", import.meta.url));

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function activityIds(result: GitHubSyncResult): string[] {
  return result.activities.map((activity) => activity.id);
}

function emptyState(): GitHubSyncStoreState {
  return githubSyncStoreStateSchema.parse(defaultState);
}

function isMissingFileError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export function snapshotFromGitHubSyncState(state: GitHubSyncStoreState): GitHubSyncSnapshot {
  return githubSyncSnapshotSchema.parse({
    lastSync: state.lastSync,
    seenActivityIds: state.seenActivityIds,
    newActivityIds: state.lastNewActivityIds,
  });
}

export class FileGitHubSyncStore implements GitHubSyncStore {
  constructor(private readonly filePath = defaultStorePath) {}

  async getState(): Promise<GitHubSyncStoreState> {
    let rawState: string;

    try {
      rawState = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isMissingFileError(error)) {
        return emptyState();
      }

      throw error;
    }

    return githubSyncStoreStateSchema.parse(JSON.parse(rawState));
  }

  async saveSync(result: GitHubSyncResult): Promise<GitHubSyncStoreState> {
    const previousState = await this.getState();
    const previousSeenIds = new Set(previousState.seenActivityIds);
    const resultActivityIds = activityIds(result);
    const lastNewActivityIds = resultActivityIds.filter((id) => !previousSeenIds.has(id));
    const nextState = githubSyncStoreStateSchema.parse({
      lastSync: result,
      seenActivityIds: unique([...previousState.seenActivityIds, ...resultActivityIds]),
      lastNewActivityIds,
    });

    await this.writeState(nextState);

    return nextState;
  }

  private async writeState(state: GitHubSyncStoreState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
  }
}

export const defaultGitHubSyncStore = new FileGitHubSyncStore();
