import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { z } from "zod";

import { ApiError, createApiClient } from "./http.ts";
import { meResponseSchema } from "./me.ts";

type MockRequest = {
  url: string;
  init?: RequestInit;
};

function createMockFetch(
  handler: (request: MockRequest) => Response | Promise<Response>,
): typeof fetch {
  return (async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return handler({ url, init });
  }) as typeof fetch;
}

describe("createApiClient", () => {
  it("adds Authorization when a token exists", async () => {
    let authHeader: string | null = null;

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => "token-123",
      fetchImpl: createMockFetch(({ init }) => {
        authHeader = init?.headers ? new Headers(init.headers).get("Authorization") : null;
        return Response.json({ ok: true });
      }),
    });

    await client.requestJson("/resource", z.object({ ok: z.boolean() }));

    assert.equal(authHeader, "Bearer token-123");
  });

  it("omits Authorization when no token exists", async () => {
    let authHeader: string | null = "present";

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      fetchImpl: createMockFetch(({ init }) => {
        authHeader = init?.headers ? new Headers(init.headers).get("Authorization") : null;
        return Response.json({ ok: true });
      }),
    });

    await client.requestJson("/resource", z.object({ ok: z.boolean() }));

    assert.equal(authHeader, null);
  });

  it("preserves caller headers and adds JSON content type for bodies", async () => {
    let contentType: string | null = null;
    let customHeader: string | null = null;

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      fetchImpl: createMockFetch(({ init }) => {
        const headers = new Headers(init?.headers);
        contentType = headers.get("Content-Type");
        customHeader = headers.get("X-Custom");
        return Response.json({ ok: true });
      }),
    });

    await client.requestJson(
      "/resource",
      z.object({ ok: z.boolean() }),
      {
        method: "POST",
        headers: { "X-Custom": "keep-me" },
        body: JSON.stringify({ name: "Ada" }),
      },
    );

    assert.equal(contentType, "application/json");
    assert.equal(customHeader, "keep-me");
  });

  it("passes credentials through to fetch", async () => {
    let credentials: RequestCredentials | undefined;

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      credentials: "include",
      fetchImpl: createMockFetch(({ init }) => {
        credentials = init?.credentials;
        return Response.json({ ok: true });
      }),
    });

    await client.requestJson("/resource", z.object({ ok: z.boolean() }));

    assert.equal(credentials, "include");
  });

  it("throws ApiError with structured error payloads", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      fetchImpl: createMockFetch(() =>
        Response.json({ error: "Unauthorized" }, { status: 401, statusText: "Unauthorized" }),
      ),
    });

    await assert.rejects(
      () => client.requestJson("/resource", z.object({ ok: z.boolean() })),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal((error as ApiError).status, 401);
        assert.equal((error as ApiError).message, "Unauthorized");
        return true;
      },
    );
  });

  it("falls back to status text for non-json errors", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      fetchImpl: createMockFetch(() => new Response("nope", { status: 500, statusText: "Server Error" })),
    });

    await assert.rejects(
      () => client.requestJson("/resource", z.object({ ok: z.boolean() })),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal((error as ApiError).status, 500);
        assert.equal((error as ApiError).message, "Server Error");
        return true;
      },
    );
  });

  it("throws ApiError for invalid success payloads", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      fetchImpl: createMockFetch(() => Response.json({ unexpected: true })),
    });

    await assert.rejects(
      () => client.requestJson("/api/me", meResponseSchema),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal((error as ApiError).status, 200);
        assert.equal((error as ApiError).message, "Invalid response payload");
        return true;
      },
    );
  });

  it("parses successful JSON through the supplied schema", async () => {
    const payload = {
      id: "user_123",
      clerkId: "clerk_123",
      email: null,
      name: "Ada",
      imageUrl: null,
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:30:00.000Z",
    };

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => null,
      fetchImpl: createMockFetch(() => Response.json(payload)),
    });

    assert.deepEqual(await client.requestJson("/api/me", meResponseSchema), payload);
  });

  it("handles 204 responses without parsing JSON", async () => {
    let jsonCalled = false;
    const originalJson = Response.prototype.json;

    Response.prototype.json = function json(this: Response) {
      jsonCalled = true;
      return originalJson.call(this);
    };

    try {
      const client = createApiClient({
        baseUrl: "https://api.example.com",
        getToken: async () => null,
        fetchImpl: createMockFetch(() => new Response(null, { status: 204 })),
      });

      await client.requestVoid("/resource", { method: "DELETE" });

      assert.equal(jsonCalled, false);
    } finally {
      Response.prototype.json = originalJson;
    }
  });
});
