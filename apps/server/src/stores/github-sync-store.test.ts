import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";

import type { GitHubSyncResult } from "@app-starter/contracts/github";

import {
  FileGitHubSyncStore,
  snapshotFromGitHubSyncState,
} from "./github-sync-store";

const sampleResult: GitHubSyncResult = {
  syncedAt: "2026-07-02T10:00:00.000Z",
  since: "2026-07-01T10:00:00.000Z",
  username: "kabeer",
  activities: [
    {
      id: "github:event:1",
      type: "push",
      action: "pushed",
      repo: "kabeer/kabeer-os",
      title: "Pushed 1 commit to kabeer/kabeer-os:main",
      summary: "Updated kabeer/kabeer-os:main with 1 commit.",
      url: "https://github.com/kabeer/kabeer-os",
      createdAt: "2026-07-02T09:00:00.000Z",
      metadata: {
        branch: "main",
        commitCount: 1,
      },
    },
  ],
  workItems: [],
  recommendedActions: [],
};

async function createStore() {
  const directory = await mkdtemp(join(tmpdir(), "kabeer-os-github-sync-"));
  return new FileGitHubSyncStore(join(directory, "github-sync.json"));
}

describe("FileGitHubSyncStore", () => {
  it("returns an empty state when no sync file exists", async () => {
    const store = await createStore();

    assert.deepEqual(await store.getState(), {
      lastSync: null,
      seenActivityIds: [],
      lastNewActivityIds: [],
    });
  });

  it("saves the latest sync and marks unseen activities as new", async () => {
    const store = await createStore();

    const state = await store.saveSync(sampleResult);

    assert.deepEqual(state, {
      lastSync: sampleResult,
      seenActivityIds: ["github:event:1"],
      lastNewActivityIds: ["github:event:1"],
    });
    assert.deepEqual(snapshotFromGitHubSyncState(state), {
      lastSync: sampleResult,
      seenActivityIds: ["github:event:1"],
      newActivityIds: ["github:event:1"],
    });
  });

  it("does not mark repeated activity IDs as new on later saves", async () => {
    const store = await createStore();

    await store.saveSync(sampleResult);
    const state = await store.saveSync(sampleResult);

    assert.deepEqual(state.seenActivityIds, ["github:event:1"]);
    assert.deepEqual(state.lastNewActivityIds, []);
  });
});
