import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const envModule = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../packages/env/src/server.ts",
);

const baseEnv: Record<string, string> = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app_starter",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/app_starter",
  CLERK_SECRET_KEY: "sk_test_replace_me",
  CLERK_PUBLISHABLE_KEY: "pk_test_replace_me",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "test",
};

function loadServerEnv(extraEnv: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ["--import", "tsx", "-e", `import("${envModule}")`], {
    env: { ...process.env, ...baseEnv, ...extraEnv },
    encoding: "utf8",
  });
}

describe("server env", () => {
  it("requires CLERK_WEBHOOK_SIGNING_SECRET", () => {
    const result = loadServerEnv({ CLERK_WEBHOOK_SIGNING_SECRET: "" });

    assert.notEqual(result.status, 0);
  });

  it("loads when CLERK_WEBHOOK_SIGNING_SECRET is set", () => {
    const result = loadServerEnv({ CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test_placeholder" });

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});
