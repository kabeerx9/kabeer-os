import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizePackageScope,
  normalizeProjectConfig,
  STARTER_DEFAULTS,
  validateBundleIdentifier,
  validateDisplayName,
  validatePackageScope,
  validateScheme,
  validateSlug,
} from "./project-config.ts";

describe("project-config", () => {
  it("normalizes package scope with and without @", () => {
    assert.equal(normalizePackageScope("acme-tasks"), "@acme-tasks");
    assert.equal(normalizePackageScope("@acme-tasks"), "@acme-tasks");
  });

  it("accepts valid project config", () => {
    const config = normalizeProjectConfig({
      displayName: "Acme Tasks",
      slug: "acme-tasks",
      packageScope: "acme-tasks",
      scheme: "acme-tasks",
      bundleIdentifier: "com.acme.tasks",
    });

    assert.deepEqual(config, {
      displayName: "Acme Tasks",
      slug: "acme-tasks",
      packageScope: "@acme-tasks",
      scheme: "acme-tasks",
      bundleIdentifier: "com.acme.tasks",
    });
  });

  it("rejects invalid slug, scope, scheme, bundle id, and display name", () => {
    assert.match(validateSlug("1bad") ?? "", /begin with a letter/);
    assert.match(validatePackageScope("@bad/scope") ?? "", /without a slash/);
    assert.match(validateScheme("Bad_Scheme") ?? "", /begin with a letter/);
    assert.match(validateBundleIdentifier("example") ?? "", /dot-separated/);
    assert.match(validateDisplayName("   ") ?? "", /non-empty/);
  });

  it("exposes starter defaults as the single source of truth", () => {
    assert.equal(STARTER_DEFAULTS.displayName, "App Starter");
    assert.equal(STARTER_DEFAULTS.packageScope, "@app-starter");
    assert.equal(STARTER_DEFAULTS.rootPackageName, "fullstack-monorepo-starter");
  });
});
