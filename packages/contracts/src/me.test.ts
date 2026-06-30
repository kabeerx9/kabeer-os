import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { apiErrorResponseSchema, meResponseSchema } from "./me.ts";

describe("meResponseSchema", () => {
  const validMe = {
    id: "user_123",
    clerkId: "clerk_123",
    email: "user@example.com",
    name: "Ada Lovelace",
    imageUrl: "https://example.com/avatar.png",
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:30:00.000Z",
  };

  it("accepts a complete valid response", () => {
    assert.deepEqual(meResponseSchema.parse(validMe), validMe);
  });

  it("accepts nullable profile fields", () => {
    const payload = {
      ...validMe,
      email: null,
      name: null,
      imageUrl: null,
    };

    assert.deepEqual(meResponseSchema.parse(payload), payload);
  });

  it("rejects missing ids", () => {
    const { id: _id, ...withoutId } = validMe;
    assert.throws(() => meResponseSchema.parse(withoutId));
  });

  it("rejects invalid date strings", () => {
    assert.throws(() =>
      meResponseSchema.parse({
        ...validMe,
        createdAt: "not-a-date",
      }),
    );
  });
});

describe("apiErrorResponseSchema", () => {
  it("accepts a string error message", () => {
    assert.deepEqual(apiErrorResponseSchema.parse({ error: "Unauthorized" }), {
      error: "Unauthorized",
    });
  });

  it("rejects an error payload without a string message", () => {
    assert.throws(() => apiErrorResponseSchema.parse({ error: 401 }));
    assert.throws(() => apiErrorResponseSchema.parse({ message: "Unauthorized" }));
  });
});
