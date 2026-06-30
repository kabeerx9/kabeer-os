import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { meResponseSchema } from "@app-starter/contracts/me";

import { serializeUser } from "./user";

describe("serializeUser", () => {
  it("returns an ISO-string payload that matches the me contract", () => {
    const createdAt = new Date("2026-06-14T12:00:00.000Z");
    const updatedAt = new Date("2026-06-14T12:30:00.000Z");

    const serialized = serializeUser({
      id: "user_123",
      clerkId: "clerk_123",
      email: "user@example.com",
      name: "Ada Lovelace",
      imageUrl: "https://example.com/avatar.png",
      createdAt,
      updatedAt,
    });

    assert.deepEqual(serialized, {
      id: "user_123",
      clerkId: "clerk_123",
      email: "user@example.com",
      name: "Ada Lovelace",
      imageUrl: "https://example.com/avatar.png",
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:30:00.000Z",
    });
    assert.deepEqual(meResponseSchema.parse(serialized), serialized);
  });
});
