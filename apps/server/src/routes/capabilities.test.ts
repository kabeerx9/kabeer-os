import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Fastify from "fastify";

import { registerCapabilitiesRoutes } from "./capabilities";

describe("capabilities routes", () => {
  it("returns the capability map", async () => {
    const app = Fastify();
    app.register(registerCapabilitiesRoutes, {
      registry: {
        listCapabilities: () => ({
          capabilities: [
            {
              name: "github.sync",
              description: "Fetch read-only GitHub work signals.",
              risk: "read",
              approval: "none",
              requiresApproval: false,
              status: "planned",
              inputSchemaName: "githubSyncInput",
              outputSchemaName: "githubSyncResult",
              tags: ["github", "sync"],
            },
          ],
        }),
      },
    });

    const response = await app.inject({ method: "GET", url: "/api/capabilities" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      capabilities: [
        {
          name: "github.sync",
          description: "Fetch read-only GitHub work signals.",
          risk: "read",
          approval: "none",
          requiresApproval: false,
          status: "planned",
          inputSchemaName: "githubSyncInput",
          outputSchemaName: "githubSyncResult",
          tags: ["github", "sync"],
        },
      ],
    });
  });
});
