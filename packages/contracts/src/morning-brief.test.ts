import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { morningBriefSchema } from "./morning-brief.ts";

const validBrief = {
  generatedAt: "2026-07-02T03:30:00.000Z",
  summary: {
    title: "3 GitHub items need attention",
    description: "You have one review request, one assigned issue, and one failed workflow.",
    totalWorkItems: 3,
    highPriorityCount: 1,
  },
  workItems: [
    {
      id: "github:review:starter-kit:42",
      source: "github",
      kind: "review_request",
      title: "Review requested on starter-kit#42",
      summary: "A teammate requested your review on a UI cleanup PR.",
      url: "https://github.com/kabeer/starter-kit/pull/42",
      priority: "medium",
      createdAt: "2026-07-01T15:00:00.000Z",
      updatedAt: "2026-07-02T02:45:00.000Z",
      metadata: {
        repo: "kabeer/starter-kit",
        number: 42,
      },
    },
  ],
  recommendedActions: [
    {
      id: "action:review:starter-kit:42",
      workItemId: "github:review:starter-kit:42",
      label: "Open review",
      reason: "Review requests are usually quick to unblock.",
      actionType: "open_url",
    },
  ],
};

describe("morningBriefSchema", () => {
  it("accepts a valid morning brief payload", () => {
    assert.deepEqual(morningBriefSchema.parse(validBrief), validBrief);
  });

  it("rejects unknown top-level fields", () => {
    assert.throws(() =>
      morningBriefSchema.parse({
        ...validBrief,
        debug: true,
      }),
    );
  });

  it("rejects unsupported action types", () => {
    assert.throws(() =>
      morningBriefSchema.parse({
        ...validBrief,
        recommendedActions: [
          {
            ...validBrief.recommendedActions[0],
            actionType: "run_shell_command",
          },
        ],
      }),
    );
  });
});
