import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify from "fastify";

import { registerAccountRoutes, type AccountRouteDeps } from "./account";

const sampleMe = {
  id: "user_123",
  clerkId: "clerk_123",
  email: "user@example.com",
  name: "Ada Lovelace",
  imageUrl: null,
  createdAt: "2026-06-14T12:00:00.000Z",
  updatedAt: "2026-06-14T12:30:00.000Z",
};

const sampleClerkUser = {
  id: "clerk_123",
  firstName: "Ada",
  lastName: "Lovelace",
  imageUrl: "https://example.com/avatar.png",
  emailAddresses: [{ id: "email_1", emailAddress: "user@example.com" }],
  primaryEmailAddressId: "email_1",
};

const baseDeps: AccountRouteDeps = {
  getAuth: () => ({ userId: "clerk_123" }),
  updateClerkUser: async () => sampleClerkUser,
  updateAccount: async (_clerkId, input) => ({
    ...sampleMe,
    name: [input.firstName ?? "Ada", input.lastName ?? "Lovelace"].filter(Boolean).join(" "),
  }),
  deleteClerkUser: async () => {},
  deleteLocalUser: async () => {},
  logLocalCleanupFailure: () => {},
};

function createTestApp(deps: Partial<AccountRouteDeps> = {}) {
  const fastify = Fastify({ logger: false });
  fastify.register(registerAccountRoutes, { ...baseDeps, ...deps });
  return fastify;
}

describe("account routes", () => {
  it("rejects unauthenticated PATCH requests", async () => {
    const app = createTestApp({ getAuth: () => ({ userId: null }) });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/account",
      payload: { firstName: "Ada" },
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { error: "Unauthorized" });
  });

  it("rejects unauthenticated DELETE requests", async () => {
    const app = createTestApp({ getAuth: () => ({ userId: null }) });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/account",
      payload: { confirmation: "DELETE" },
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { error: "Unauthorized" });
  });

  it("rejects invalid profile payloads", async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/account",
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(typeof response.json().error, "string");
  });

  it("updates the account profile", async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/account",
      payload: { firstName: "Grace", lastName: "Hopper" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().name, "Grace Hopper");
  });

  it("rejects invalid delete confirmation", async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: "DELETE",
      url: "/api/account",
      payload: { confirmation: "remove" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(typeof response.json().error, "string");
  });

  it("does not delete local data when Clerk deletion fails", async () => {
    let localDeleteCalled = false;

    const app = createTestApp({
      deleteClerkUser: async () => {
        throw new Error("Clerk unavailable");
      },
      deleteLocalUser: async () => {
        localDeleteCalled = true;
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/account",
      payload: { confirmation: "DELETE" },
    });

    assert.equal(response.statusCode, 502);
    assert.equal(localDeleteCalled, false);
  });

  it("deletes local data after Clerk deletion succeeds", async () => {
    let localDeleteCalled = false;

    const app = createTestApp({
      deleteLocalUser: async () => {
        localDeleteCalled = true;
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/account",
      payload: { confirmation: "DELETE" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(localDeleteCalled, true);
    assert.equal(response.body, "");
  });

  it("returns 204 when local cleanup fails after Clerk deletion", async () => {
    let cleanupLogged = false;

    const app = createTestApp({
      deleteLocalUser: async () => {
        throw new Error("Database unavailable");
      },
      logLocalCleanupFailure: () => {
        cleanupLogged = true;
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/account",
      payload: { confirmation: "DELETE" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
    assert.equal(cleanupLogged, true);
  });
});
