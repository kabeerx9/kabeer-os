import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { formatDoctorReport, runDoctor } from "./doctor.ts";
import { applyReplacements } from "./init-project.ts";
import { STARTER_DEFAULTS } from "./project-config.ts";

function writeHealthyFixture(root: string): void {
  mkdirSync(join(root, "apps/web"), { recursive: true });
  mkdirSync(join(root, "apps/native"), { recursive: true });
  mkdirSync(join(root, "apps/server"), { recursive: true });
  mkdirSync(join(root, "packages/config"), { recursive: true });
  mkdirSync(join(root, "packages/db/prisma/generated/client"), { recursive: true });

  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify(
      {
        name: "acme-tasks",
        dependencies: {
          "@acme-tasks/env": "workspace:*",
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(root, "packages/config/package.json"),
    `${JSON.stringify({ name: "@acme-tasks/config" }, null, 2)}\n`,
  );

  mkdirSync(join(root, "packages/env"), { recursive: true });
  writeFileSync(
    join(root, "packages/env/package.json"),
    `${JSON.stringify({ name: "@acme-tasks/env" }, null, 2)}\n`,
  );

  writeFileSync(
    join(root, "apps/web/package.json"),
    `${JSON.stringify(
      {
        name: "web",
        dependencies: {
          "@acme-tasks/env": "workspace:*",
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
          name: "Acme Tasks",
          slug: "acme-tasks",
          scheme: "acme-tasks",
          ios: { bundleIdentifier: "com.acme.tasks" },
          android: { package: "com.acme.tasks" },
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(join(root, "apps/web/index.html"), "<title>Acme Tasks</title>\n");

  writeFileSync(join(root, "apps/server/.env.example"), 'DATABASE_URL="postgresql://example"\n');
  writeFileSync(join(root, "apps/web/.env.example"), 'VITE_SERVER_URL="http://localhost:3000"\n');
  writeFileSync(
    join(root, "apps/native/.env.example"),
    'EXPO_PUBLIC_SERVER_URL="http://localhost:3000"\n',
  );

  writeFileSync(join(root, "apps/server/.env"), 'DATABASE_URL="postgresql://example"\n');
  writeFileSync(join(root, "apps/web/.env"), 'VITE_SERVER_URL="http://localhost:3000"\n');
  writeFileSync(join(root, "apps/native/.env"), 'EXPO_PUBLIC_SERVER_URL="http://localhost:3000"\n');
  writeFileSync(join(root, "packages/db/prisma/generated/client/index.js"), "export {};\n");
}

describe("doctor", () => {
  it("reports missing env files and unresolved workspace dependencies", () => {
    const root = mkdtempSync(join(tmpdir(), "doctor-missing-"));
    try {
      mkdirSync(join(root, "apps/web"), { recursive: true });
      mkdirSync(join(root, "apps/server"), { recursive: true });
      mkdirSync(join(root, "apps/native"), { recursive: true });
      mkdirSync(join(root, "packages/config"), { recursive: true });

      writeFileSync(
        join(root, "package.json"),
        `${JSON.stringify(
          {
            name: "fullstack-monorepo-starter",
            dependencies: {
              "@app-starter/env": "workspace:*",
            },
          },
          null,
          2,
        )}\n`,
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

      writeFileSync(join(root, "apps/server/.env.example"), 'DATABASE_URL="postgresql://example"\n');
      writeFileSync(join(root, "apps/web/.env.example"), 'VITE_SERVER_URL="http://localhost:3000"\n');
      writeFileSync(
        join(root, "apps/native/.env.example"),
        'EXPO_PUBLIC_SERVER_URL="http://localhost:3000"\n',
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

      const { findings, exitCode } = runDoctor(root);
      const report = formatDoctorReport(findings);

      assert.equal(exitCode, 1);
      assert.match(report, /Missing apps\/server\/\.env/);
      assert.match(report, /unresolved workspace dependency @app-starter\/ui/);
      assert.match(report, /starter-identifiers/);
      assert.doesNotMatch(report, /postgresql:\/\/example/);
      assert.doesNotMatch(report, /pk_test/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("passes on a fully initialized fixture", () => {
    const root = mkdtempSync(join(tmpdir(), "doctor-healthy-"));
    try {
      writeHealthyFixture(root);

      const { findings, exitCode } = runDoctor(root);
      const report = formatDoctorReport(findings);

      assert.equal(exitCode, 0);
      assert.doesNotMatch(report, /ERRORS:/);
      assert.doesNotMatch(report, /postgresql:\/\/example/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("never includes fixture secret values in captured output", () => {
    const root = mkdtempSync(join(tmpdir(), "doctor-secrets-"));
    try {
      mkdirSync(join(root, "apps/server"), { recursive: true });
      mkdirSync(join(root, "apps/native"), { recursive: true });
      writeFileSync(join(root, "package.json"), `${JSON.stringify({ name: "acme-tasks" }, null, 2)}\n`);
      writeFileSync(join(root, "apps/server/.env.example"), 'CLERK_SECRET_KEY="sk_test_super_secret"\n');
      writeFileSync(join(root, "apps/server/.env"), 'CLERK_SECRET_KEY="sk_test_super_secret"\n');
      writeFileSync(
        join(root, "apps/native/app.json"),
        `${JSON.stringify(
          {
            expo: {
              name: "Acme Tasks",
              slug: "acme-tasks",
              scheme: "acme-tasks",
              ios: { bundleIdentifier: "com.acme.tasks" },
              android: { package: "com.acme.tasks" },
            },
          },
          null,
          2,
        )}\n`,
      );

      const report = formatDoctorReport(runDoctor(root).findings);
      assert.doesNotMatch(report, /sk_test_super_secret/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("doctor starter scan helper", () => {
  it("flags starter values after replacement baseline", () => {
    const sample = applyReplacements(
      `${STARTER_DEFAULTS.displayName} ${STARTER_DEFAULTS.packageScope}/ui`,
      {
        displayName: "Acme Tasks",
        slug: "acme-tasks",
        packageScope: "@acme-tasks",
        scheme: "acme-tasks",
        bundleIdentifier: "com.acme.tasks",
      },
    );

    assert.doesNotMatch(sample, /App Starter/);
    assert.doesNotMatch(sample, /@app-starter/);
  });
});
