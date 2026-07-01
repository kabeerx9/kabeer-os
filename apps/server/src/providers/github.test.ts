import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createGhGitHubProvider, GitHubProviderError, type GhCommandRunner } from "./github";

function createRunner(responses: Map<string, string>): GhCommandRunner {
  return {
    run: async (args) => {
      const key = JSON.stringify(args);
      const response = responses.get(key);

      if (response === undefined) {
        throw new Error(`Unexpected command: ${key}`);
      }

      return response;
    },
  };
}

describe("createGhGitHubProvider", () => {
  it("returns activity from the last 24 hours", async () => {
    const provider = createGhGitHubProvider({
      now: () => new Date("2026-07-02T10:00:00.000Z"),
      runner: createRunner(
        new Map([
          [JSON.stringify(["api", "user", "--jq", ".login"]), "kabeer\n"],
          [
            JSON.stringify(["api", "/users/kabeer/events?per_page=100"]),
            JSON.stringify([
              {
                id: "1",
                type: "PushEvent",
                repo: { name: "kabeer/kabeer-os" },
                payload: {
                  ref: "refs/heads/main",
                  commits: [
                    { sha: "a1b2c3d", message: "Group dashboard by project" },
                    { sha: "b2c3d4e", message: "Show push commit messages" },
                  ],
                },
                created_at: "2026-07-02T09:00:00.000Z",
              },
              {
                id: "2",
                type: "PullRequestReviewEvent",
                repo: { name: "kabeer/kabeer-os" },
                payload: {
                  action: "submitted",
                  pull_request: {
                    number: 42,
                    title: "Improve dashboard",
                    html_url: "https://github.com/kabeer/kabeer-os/pull/42",
                  },
                },
                created_at: "2026-07-02T08:00:00.000Z",
              },
              {
                id: "old",
                type: "IssuesEvent",
                repo: { name: "kabeer/kabeer-os" },
                payload: {
                  action: "opened",
                  issue: {
                    number: 7,
                    title: "Old issue",
                    html_url: "https://github.com/kabeer/kabeer-os/issues/7",
                  },
                },
                created_at: "2026-06-30T08:00:00.000Z",
              },
            ]),
          ],
        ]),
      ),
    });

    const result = await provider.syncActivity({ lookbackHours: 24 });

    assert.equal(result.username, "kabeer");
    assert.equal(result.since, "2026-07-01T10:00:00.000Z");
    assert.equal(result.activities.length, 2);
    assert.equal(result.activities[0]?.type, "push");
    assert.deepEqual(result.activities[0]?.metadata.commits, [
      {
        sha: "a1b2c3d",
        message: "Group dashboard by project",
        url: "https://github.com/kabeer/kabeer-os/commit/a1b2c3d",
      },
      {
        sha: "b2c3d4e",
        message: "Show push commit messages",
        url: "https://github.com/kabeer/kabeer-os/commit/b2c3d4e",
      },
    ]);
    assert.equal(result.activities[1]?.type, "pull_request_review");
    assert.equal(result.workItems.length, 2);
    assert.equal(result.workItems[0]?.kind, "github_activity");
  });

  it("fetches push commit messages from compare when event payload omits them", async () => {
    const before = "1111111111111111111111111111111111111111";
    const head = "2222222222222222222222222222222222222222";
    const provider = createGhGitHubProvider({
      now: () => new Date("2026-07-02T10:00:00.000Z"),
      runner: createRunner(
        new Map([
          [JSON.stringify(["api", "user", "--jq", ".login"]), "kabeer\n"],
          [
            JSON.stringify(["api", "/users/kabeer/events?per_page=100"]),
            JSON.stringify([
              {
                id: "1",
                type: "PushEvent",
                repo: { name: "kabeer/kabeer-os" },
                payload: {
                  ref: "refs/heads/main",
                  before,
                  head,
                },
                created_at: "2026-07-02T09:00:00.000Z",
              },
            ]),
          ],
          [
            JSON.stringify(["api", `/repos/kabeer/kabeer-os/compare/${before}...${head}`]),
            JSON.stringify({
              commits: [
                {
                  sha: "a1b2c3d",
                  commit: { message: "Group dashboard by project" },
                  html_url: "https://github.com/kabeer/kabeer-os/commit/a1b2c3d",
                },
                {
                  sha: "b2c3d4e",
                  commit: { message: "Show push commit messages" },
                  html_url: "https://github.com/kabeer/kabeer-os/commit/b2c3d4e",
                },
              ],
            }),
          ],
        ]),
      ),
    });

    const result = await provider.syncActivity({ lookbackHours: 24 });

    assert.equal(result.activities[0]?.title, "Pushed 2 commits to kabeer/kabeer-os:main");
    assert.deepEqual(result.activities[0]?.metadata.commits, [
      {
        sha: "a1b2c3d",
        message: "Group dashboard by project",
        url: "https://github.com/kabeer/kabeer-os/commit/a1b2c3d",
      },
      {
        sha: "b2c3d4e",
        message: "Show push commit messages",
        url: "https://github.com/kabeer/kabeer-os/commit/b2c3d4e",
      },
    ]);
  });

  it("uses an explicit since datetime when provided", async () => {
    const provider = createGhGitHubProvider({
      now: () => new Date("2026-07-02T10:00:00.000Z"),
      runner: createRunner(
        new Map([
          [JSON.stringify(["api", "user", "--jq", ".login"]), "kabeer"],
          [JSON.stringify(["api", "/users/kabeer/events?per_page=100"]), "[]"],
        ]),
      ),
    });

    const result = await provider.syncActivity({
      lookbackHours: 24,
      since: "2026-07-02T09:30:00.000Z",
    });

    assert.equal(result.since, "2026-07-02T09:30:00.000Z");
  });

  it("returns attention items from review requests, assignments, mentions, and failed workflows", async () => {
    const provider = createGhGitHubProvider({
      now: () => new Date("2026-07-02T10:00:00.000Z"),
      runner: createRunner(
        new Map([
          [JSON.stringify(["api", "user", "--jq", ".login"]), "kabeer\n"],
          [
            JSON.stringify([
              "api",
              "/search/issues?q=is%3Apr+state%3Aopen+review-requested%3Akabeer+archived%3Afalse&per_page=50",
            ]),
            JSON.stringify({
              items: [
                {
                  id: 10,
                  number: 12,
                  title: "Review dashboard PR",
                  html_url: "https://github.com/kabeer/kabeer-os/pull/12",
                  repository_url: "https://api.github.com/repos/kabeer/kabeer-os",
                  created_at: "2026-07-02T08:00:00.000Z",
                  updated_at: "2026-07-02T09:00:00.000Z",
                  pull_request: {},
                },
              ],
            }),
          ],
          [
            JSON.stringify([
              "api",
              "/search/issues?q=state%3Aopen+assignee%3Akabeer+archived%3Afalse&per_page=50",
            ]),
            JSON.stringify({
              items: [
                {
                  id: 11,
                  number: 13,
                  title: "Assigned issue",
                  html_url: "https://github.com/kabeer/kabeer-os/issues/13",
                  repository_url: "https://api.github.com/repos/kabeer/kabeer-os",
                  created_at: "2026-07-02T07:00:00.000Z",
                  updated_at: "2026-07-02T07:30:00.000Z",
                },
              ],
            }),
          ],
          [
            JSON.stringify([
              "api",
              "/search/issues?q=state%3Aopen+mentions%3Akabeer+archived%3Afalse&per_page=50",
            ]),
            JSON.stringify({
              items: [
                {
                  id: 10,
                  number: 12,
                  title: "Review dashboard PR",
                  html_url: "https://github.com/kabeer/kabeer-os/pull/12",
                  repository_url: "https://api.github.com/repos/kabeer/kabeer-os",
                  created_at: "2026-07-02T08:00:00.000Z",
                  updated_at: "2026-07-02T09:00:00.000Z",
                  pull_request: {},
                },
              ],
            }),
          ],
          [
            JSON.stringify(["api", "/repos/kabeer/kabeer-os/actions/runs?status=failure&per_page=20"]),
            JSON.stringify({
              workflow_runs: [
                {
                  id: 20,
                  name: "CI",
                  display_title: "Typecheck failed",
                  html_url: "https://github.com/kabeer/kabeer-os/actions/runs/20",
                  status: "completed",
                  conclusion: "failure",
                  head_branch: "main",
                  run_number: 33,
                  created_at: "2026-07-02T06:00:00.000Z",
                  updated_at: "2026-07-02T06:05:00.000Z",
                },
              ],
            }),
          ],
        ]),
      ),
    });

    const result = await provider.syncAttention({ repositories: ["kabeer/kabeer-os"] });

    assert.equal(result.username, "kabeer");
    assert.equal(result.syncedAt, "2026-07-02T10:00:00.000Z");
    assert.deepEqual(result.repositories, ["kabeer/kabeer-os"]);
    assert.deepEqual(
      result.items.map((item) => item.kind),
      ["review_request", "assigned", "failed_workflow"],
    );
    assert.equal(result.items[0]?.summary, "Review requested on PR #12 in kabeer/kabeer-os.");
    assert.equal(result.items[2]?.summary, "CI failed on main.");
  });

  it("blocks non-allowlisted default gh commands", async () => {
    const provider = createGhGitHubProvider({
      runner: {
        run: async () => {
          throw new GitHubProviderError("Blocked non-allowlisted GitHub CLI command");
        },
      },
    });

    await assert.rejects(
      () => provider.syncActivity({ lookbackHours: 24 }),
      GitHubProviderError,
    );
  });

  it("rejects invalid GitHub event JSON", async () => {
    const provider = createGhGitHubProvider({
      now: () => new Date("2026-07-02T10:00:00.000Z"),
      runner: createRunner(
        new Map([
          [JSON.stringify(["api", "user", "--jq", ".login"]), "kabeer"],
          [JSON.stringify(["api", "/users/kabeer/events?per_page=100"]), "not-json"],
        ]),
      ),
    });

    await assert.rejects(
      () => provider.syncActivity({ lookbackHours: 24 }),
      GitHubProviderError,
    );
  });

  it("labels empty push payloads as branch updates", async () => {
    const provider = createGhGitHubProvider({
      now: () => new Date("2026-07-02T10:00:00.000Z"),
      runner: createRunner(
        new Map([
          [JSON.stringify(["api", "user", "--jq", ".login"]), "kabeer"],
          [
            JSON.stringify(["api", "/users/kabeer/events?per_page=100"]),
            JSON.stringify([
              {
                id: "1",
                type: "PushEvent",
                repo: { name: "kabeer/kabeer-os" },
                payload: {
                  ref: "refs/heads/main",
                  commits: [],
                },
                created_at: "2026-07-02T09:00:00.000Z",
              },
            ]),
          ],
        ]),
      ),
    });

    const result = await provider.syncActivity({ lookbackHours: 24 });

    assert.equal(result.activities[0]?.title, "Updated kabeer/kabeer-os:main");
  });
});
