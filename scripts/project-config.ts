export type ProjectConfig = {
  displayName: string;
  slug: string;
  packageScope: string;
  scheme: string;
  bundleIdentifier: string;
};

export type StarterDefaults = ProjectConfig & {
  rootPackageName: string;
};

export const STARTER_DEFAULTS: StarterDefaults = {
  displayName: "App Starter",
  slug: "fullstack-monorepo-starter",
  packageScope: "@app-starter",
  scheme: "app-starter",
  bundleIdentifier: "com.example.appstarter",
  rootPackageName: "fullstack-monorepo-starter",
};

export const STARTER_PLACEHOLDER_COPY = [
  "Replace this dashboard with your product.",
  "Replace this screen with your product.",
] as const;

const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;
const SCOPE_PATTERN = /^@[a-z0-9-]+$/;
const BUNDLE_ID_PATTERN = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;

export function normalizePackageScope(scope: string): string {
  const trimmed = scope.trim();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function validateDisplayName(displayName: string): string | undefined {
  if (displayName.trim().length === 0) {
    return "displayName must be non-empty after trimming";
  }
  return undefined;
}

export function validateSlug(slug: string): string | undefined {
  if (!SLUG_PATTERN.test(slug)) {
    return "slug must use lowercase letters, digits, and hyphens and begin with a letter";
  }
  return undefined;
}

export function validateScheme(scheme: string): string | undefined {
  if (!SLUG_PATTERN.test(scheme)) {
    return "scheme must use lowercase letters, digits, and hyphens and begin with a letter";
  }
  return undefined;
}

export function validatePackageScope(packageScope: string): string | undefined {
  if (!SCOPE_PATTERN.test(packageScope)) {
    return "packageScope must be valid npm scope syntax without a slash";
  }
  return undefined;
}

export function validateBundleIdentifier(bundleIdentifier: string): string | undefined {
  if (!BUNDLE_ID_PATTERN.test(bundleIdentifier)) {
    return "bundleIdentifier must contain at least two dot-separated identifier segments";
  }
  return undefined;
}

export function normalizeProjectConfig(input: {
  displayName: string;
  slug: string;
  packageScope: string;
  scheme: string;
  bundleIdentifier: string;
}): ProjectConfig {
  const displayName = input.displayName.trim();
  const slug = input.slug.trim();
  const packageScope = normalizePackageScope(input.packageScope);
  const scheme = input.scheme.trim();
  const bundleIdentifier = input.bundleIdentifier.trim();

  const errors = [
    validateDisplayName(displayName),
    validateSlug(slug),
    validatePackageScope(packageScope),
    validateScheme(scheme),
    validateBundleIdentifier(bundleIdentifier),
  ].filter((error): error is string => error !== undefined);

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return {
    displayName,
    slug,
    packageScope,
    scheme,
    bundleIdentifier,
  };
}
