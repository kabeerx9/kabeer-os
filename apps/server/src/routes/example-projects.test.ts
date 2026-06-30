import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify from "fastify";

import { registerExampleProjectsRoutes, type ExampleProjectsRouteDeps } from "./example-projects";

const sampleProject = {
  id: "proj_123",
  name: "Starter project",
  description: "Reference CRUD",
  createdAt: "2026-06-14T12:00:00.000Z",
  updatedAt: "2026-06-14T12:30:00.000Z",
};

function createTestApp(deps: Partial<ExampleProjectsRouteDeps>) {
  const fastify = Fastify();
  fastify.register(registerExampleProjectsRoutes, deps);
  return fastify;
}

describe("example-projects routes", () => {
  it("rejects unauthenticated requests", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: null }),
      service: {
        listByClerkId: async () => [],
        createByClerkId: async () => sampleProject,
        updateByClerkId: async () => sampleProject,
        deleteByClerkId: async () => true,
      },
    });

    const response = await app.inject({ method: "GET", url: "/api/example-projects" });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { error: "Unauthorized" });
  });

  it("creates a project", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: "clerk_123" }),
      syncFromClerk: async () => ({
        clerkId: "clerk_123",
        email: "user@example.com",
        name: "Ada",
        imageUrl: null,
      }),
      service: {
        listByClerkId: async () => [],
        createByClerkId: async (_clerkId, input) => ({
          ...sampleProject,
          name: input.name,
          description: input.description ?? null,
        }),
        updateByClerkId: async () => sampleProject,
        deleteByClerkId: async () => true,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/example-projects",
      payload: { name: "New project", description: "Notes" },
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().name, "New project");
  });

  it("rejects invalid create input", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: "clerk_123" }),
      service: {
        listByClerkId: async () => [],
        createByClerkId: async () => sampleProject,
        updateByClerkId: async () => sampleProject,
        deleteByClerkId: async () => true,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/example-projects",
      payload: { name: "   " },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(typeof response.json().error, "string");
  });

  it("lists owned projects", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: "clerk_123" }),
      service: {
        listByClerkId: async () => [sampleProject],
        createByClerkId: async () => sampleProject,
        updateByClerkId: async () => sampleProject,
        deleteByClerkId: async () => true,
      },
    });

    const response = await app.inject({ method: "GET", url: "/api/example-projects" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), [sampleProject]);
  });

  it("updates an owned project", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: "clerk_123" }),
      service: {
        listByClerkId: async () => [],
        createByClerkId: async () => sampleProject,
        updateByClerkId: async (_clerkId, _id, input) => ({
          ...sampleProject,
          name: input.name ?? sampleProject.name,
        }),
        deleteByClerkId: async () => true,
      },
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/example-projects/proj_123",
      payload: { name: "Renamed" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().name, "Renamed");
  });

  it("returns 404 when updating a non-owned project", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: "clerk_123" }),
      service: {
        listByClerkId: async () => [],
        createByClerkId: async () => sampleProject,
        updateByClerkId: async () => null,
        deleteByClerkId: async () => true,
      },
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/example-projects/other_users_project",
      payload: { name: "Renamed" },
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { error: "Not found" });
  });

  it("deletes an owned project with 204", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: "clerk_123" }),
      service: {
        listByClerkId: async () => [],
        createByClerkId: async () => sampleProject,
        updateByClerkId: async () => sampleProject,
        deleteByClerkId: async () => true,
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/example-projects/proj_123",
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
  });

  it("returns 404 when deleting a non-owned project", async () => {
    const app = createTestApp({
      getAuth: () => ({ userId: "clerk_123" }),
      service: {
        listByClerkId: async () => [],
        createByClerkId: async () => sampleProject,
        updateByClerkId: async () => sampleProject,
        deleteByClerkId: async () => false,
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/example-projects/other_users_project",
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { error: "Not found" });
  });
});
