import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { capabilityListSchema, capabilitySchema } from "./capabilities.ts";

const validCapability = {
  name: "github.sync",
  description: "Fetch read-only GitHub work signals and normalize them into work items.",
  risk: "read",
  approval: "none",
  requiresApproval: false,
  status: "planned",
  inputSchemaName: "githubSyncInput",
  outputSchemaName: "githubSyncResult",
  tags: ["github", "sync"],
};

describe("capabilitySchema", () => {
  it("accepts a valid capability descriptor", () => {
    assert.deepEqual(capabilitySchema.parse(validCapability), validCapability);
  });

  it("rejects unsupported capability names", () => {
    assert.throws(() =>
      capabilitySchema.parse({
        ...validCapability,
        name: "shell.run",
      }),
    );
  });

  it("rejects unknown fields", () => {
    assert.throws(() =>
      capabilitySchema.parse({
        ...validCapability,
        command: "gh issue list",
      }),
    );
  });
});

describe("capabilityListSchema", () => {
  it("accepts a capability list response", () => {
    const payload = { capabilities: [validCapability] };
    assert.deepEqual(capabilityListSchema.parse(payload), payload);
  });
});
