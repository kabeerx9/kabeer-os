import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createExampleProjectInputSchema,
  exampleProjectListSchema,
  exampleProjectSchema,
  updateExampleProjectInputSchema,
} from "./example-projects.ts";

describe("exampleProjectSchema", () => {
  const validProject = {
    id: "proj_123",
    name: "Starter project",
    description: "A reference CRUD example",
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:30:00.000Z",
  };

  it("accepts a valid response without ownerId", () => {
    assert.deepEqual(exampleProjectSchema.parse(validProject), validProject);
  });

  it("rejects payloads that expose ownerId", () => {
    assert.throws(() =>
      exampleProjectSchema.parse({
        ...validProject,
        ownerId: "user_123",
      }),
    );
  });

  it("accepts null description", () => {
    const payload = { ...validProject, description: null };
    assert.deepEqual(exampleProjectSchema.parse(payload), payload);
  });
});

describe("exampleProjectListSchema", () => {
  it("accepts an array of projects", () => {
    const items = [
      {
        id: "proj_1",
        name: "One",
        description: null,
        createdAt: "2026-06-14T12:00:00.000Z",
        updatedAt: "2026-06-14T12:00:00.000Z",
      },
    ];

    assert.deepEqual(exampleProjectListSchema.parse(items), items);
  });
});

describe("createExampleProjectInputSchema", () => {
  it("accepts a valid name and trims whitespace", () => {
    assert.deepEqual(createExampleProjectInputSchema.parse({ name: "  Alpha  " }), {
      name: "Alpha",
    });
  });

  it("accepts an optional trimmed description", () => {
    assert.deepEqual(
      createExampleProjectInputSchema.parse({
        name: "Alpha",
        description: "  Notes  ",
      }),
      {
        name: "Alpha",
        description: "Notes",
      },
    );
  });

  it("normalizes an empty description to null", () => {
    assert.deepEqual(
      createExampleProjectInputSchema.parse({
        name: "Alpha",
        description: "   ",
      }),
      {
        name: "Alpha",
        description: null,
      },
    );
  });

  it("rejects empty names after trimming", () => {
    assert.throws(() => createExampleProjectInputSchema.parse({ name: "   " }));
  });

  it("rejects names longer than 100 characters", () => {
    assert.throws(() =>
      createExampleProjectInputSchema.parse({
        name: "a".repeat(101),
      }),
    );
  });

  it("rejects descriptions longer than 1000 characters", () => {
    assert.throws(() =>
      createExampleProjectInputSchema.parse({
        name: "Alpha",
        description: "a".repeat(1001),
      }),
    );
  });
});

describe("updateExampleProjectInputSchema", () => {
  it("accepts a partial update with one field", () => {
    assert.deepEqual(updateExampleProjectInputSchema.parse({ name: "Beta" }), {
      name: "Beta",
    });
  });

  it("rejects empty updates", () => {
    assert.throws(() => updateExampleProjectInputSchema.parse({}));
  });

  it("normalizes an empty description to null", () => {
    assert.deepEqual(updateExampleProjectInputSchema.parse({ description: "  " }), {
      description: null,
    });
  });
});
