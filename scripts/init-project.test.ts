import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  applyReplacements,
  detectMixedPackageScopes,
  planInitChanges,
  runInitProject,
} from "./init-project.ts";
import { STARTER_DEFAULTS } from "./project-config.ts";

const ACME_CONFIG = {
  displayName: "Acme Tasks",
  slug: "acme-tasks",
  packageScope: "@acme-tasks",
  scheme: "acme-tasks",
  bundleIdentifier: "com.acme.tasks",
};

function writeStarterFixture(root: string): void {
  mkdirSync(join(root, "apps/web"), { recursive: true });
  mkdirSync(join(root, "apps/native"), { recursive: true });
  mkdirSync(join(root, "apps/server"), { recursive: true });
  mkdirSync(join(root, "packages/config"), { recursive: true });

  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify(
      {
        name: "fullstack-monorepo-starter",
        dependencies: {
          "@app-starter/env": "workspace:*",
        },
        scripts: {
          "db:generate": "turbo -F @app-starter/db db:generate",
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(root, "packages/config/package.json"),
    `${JSON.stringify({ name: "@app-starter/config" }, null, 2)}\n`,
  );

  writeFileSync(
    join(root, "apps/web/package.json"),
    `${JSON.stringify(
      {
        name: "web",
        dependencies: {
          "@app-starter/ui": "workspace:*",
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(root, "apps/native/app.json"),
    `${JSON.stringify(
      {
        expo: {
          name: "App Starter",
          slug: "fullstack-monorepo-starter",
          scheme: "app-starter",
          ios: { bundleIdentifier: "com.example.appstarter" },
          android: { package: "com.example.appstarter" },
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(join(root, "apps/web/index.html"), "<title>App Starter</title>\n");
  mkdirSync(join(root, "apps/web/src/routes/_auth"), { recursive: true });
  writeFileSync(
    join(root, "apps/web/src/routes/_auth/dashboard.tsx"),
    `<div>App Starter\nReplace this dashboard with your product.</div>\n`,
  );

  writeFileSync(join(root, "apps/server/.env.example"), 'DATABASE_URL="postgresql://example"\n');
  writeFileSync(join(root, "apps/web/.env.example"), 'VITE_SERVER_URL="http://localhost:3000"\n');
  writeFileSync(
    join(root, "apps/native/.env.example"),
    'EXPO_PUBLIC_SERVER_URL="http://localhost:3000"\n',
  );
}

describe("init-project", () => {
  it("dry-run performs zero writes", async () => {
    const root = mkdtempSync(join(tmpdir(), "init-dry-run-"));
    try {
      writeStarterFixture(root);
      await runInitProject(root, {
        config: ACME_CONFIG,
        dryRun: true,
        yes: true,
        interactive: false,
      });

      assert.match(readFileSync(join(root, "package.json"), "utf8"), /fullstack-monorepo-starter/);
      assert.equal(existsSync(join(root, "apps/server/.env")), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("updates package names, imports, branding, and expo identifiers", async () => {
    const root = mkdtempSync(join(tmpdir(), "init-write-"));
    try {
      writeStarterFixture(root);
      await runInitProject(root, {
        config: ACME_CONFIG,
        dryRun: false,
        yes: true,
        interactive: false,
      });

      const rootPackage = readFileSync(join(root, "package.json"), "utf8");
      assert.match(rootPackage, /"name": "acme-tasks"/);
      assert.match(rootPackage, /"@acme-tasks\/env"/);
      assert.match(rootPackage, /turbo -F @acme-tasks\/db db:generate/);

      const appJson = readFileSync(join(root, "apps/native/app.json"), "utf8");
      assert.match(appJson, /"name": "Acme Tasks"/);
      assert.match(appJson, /"slug": "acme-tasks"/);
      assert.match(appJson, /"scheme": "acme-tasks"/);
      assert.match(appJson, /"bundleIdentifier": "com.acme.tasks"/);
      assert.match(appJson, /"package": "com.acme.tasks"/);

      const html = readFileSync(join(root, "apps/web/index.html"), "utf8");
      assert.match(html, /Acme Tasks/);

      assert.equal(existsSync(join(root, "apps/server/.env")), true);
      assert.equal(existsSync(join(root, "apps/web/.env")), true);
      assert.equal(existsSync(join(root, "apps/native/.env")), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not overwrite existing env files", async () => {
    const root = mkdtempSync(join(tmpdir(), "init-env-"));
    try {
      writeStarterFixture(root);
      writeFileSync(join(root, "apps/server/.env"), 'DATABASE_URL="keep-me"\n');

      await runInitProject(root, {
        config: ACME_CONFIG,
        dryRun: false,
        yes: true,
        interactive: false,
      });

      assert.match(readFileSync(join(root, "apps/server/.env"), "utf8"), /keep-me/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("re-running with the same config is a no-op", async () => {
    const root = mkdtempSync(join(tmpdir(), "init-idempotent-"));
    try {
      writeStarterFixture(root);
      await runInitProject(root, {
        config: ACME_CONFIG,
        dryRun: false,
        yes: true,
        interactive: false,
      });

      const before = readFileSync(join(root, "package.json"), "utf8");
      await runInitProject(root, {
        config: ACME_CONFIG,
        dryRun: false,
        yes: true,
        interactive: false,
      });
      const after = readFileSync(join(root, "package.json"), "utf8");

      assert.equal(before, after);
      assert.deepEqual(planInitChanges(root, ACME_CONFIG), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects mixed package scopes", () => {
    const root = mkdtempSync(join(tmpdir(), "init-mixed-"));
    try {
      writeStarterFixture(root);
      writeFileSync(
        join(root, "apps/web/package.json"),
        `${JSON.stringify(
          {
            name: "web",
            dependencies: {
              "@app-starter/ui": "workspace:*",
              "@acme-tasks/ui": "workspace:*",
            },
          },
          null,
          2,
        )}\n`,
      );

      assert.deepEqual(detectMixedPackageScopes(root), ["@acme-tasks"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("applyReplacements uses starter defaults", () => {
    const updated = applyReplacements(
      `${STARTER_DEFAULTS.packageScope}/ui ${STARTER_DEFAULTS.displayName}`,
      ACME_CONFIG,
    );
    assert.equal(updated, "@acme-tasks/ui Acme Tasks");
  });
});
