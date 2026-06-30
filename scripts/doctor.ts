import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  STARTER_DEFAULTS,
  STARTER_PLACEHOLDER_COPY,
  type StarterDefaults,
} from "./project-config.ts";

export type DoctorSeverity = "error" | "warning" | "info";

export type DoctorFinding = {
  severity: DoctorSeverity;
  category: string;
  message: string;
};

const MIN_NODE_MAJOR = 20;

const ENV_FILE_CHECKS = [
  {
    label: "server",
    examplePath: "apps/server/.env.example",
    envPath: "apps/server/.env",
  },
  {
    label: "web",
    examplePath: "apps/web/.env.example",
    envPath: "apps/web/.env",
  },
  {
    label: "native",
    examplePath: "apps/native/.env.example",
    envPath: "apps/native/.env",
  },
] as const;

const STARTER_SCAN_ROOTS = ["apps", "packages"] as const;

function parseEnvKeys(content: string): string[] {
  const keys: string[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match) {
      keys.push(match[1]!);
    }
  }

  return keys;
}

function listPackageJsonPaths(repoRoot: string): string[] {
  const paths = [join(repoRoot, "package.json")];

  for (const dir of STARTER_SCAN_ROOTS) {
    const absoluteDir = join(repoRoot, dir);
    if (!existsSync(absoluteDir)) {
      continue;
    }

    for (const entry of readdirSync(absoluteDir)) {
      const packageJsonPath = join(absoluteDir, entry, "package.json");
      if (existsSync(packageJsonPath)) {
        paths.push(packageJsonPath);
      }
    }
  }

  return paths;
}

function collectWorkspacePackageNames(repoRoot: string): Set<string> {
  const names = new Set<string>();

  for (const packageJsonPath of listPackageJsonPaths(repoRoot)) {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name?: string };
    if (parsed.name) {
      names.add(parsed.name);
    }
  }

  return names;
}

function scanStarterValues(repoRoot: string, defaults: StarterDefaults): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const starterValues = [
    defaults.displayName,
    defaults.packageScope,
    defaults.rootPackageName,
    defaults.scheme,
    defaults.bundleIdentifier,
  ];

  for (const root of STARTER_SCAN_ROOTS) {
    const absoluteRoot = join(repoRoot, root);
    if (!existsSync(absoluteRoot)) {
      continue;
    }

    const stack = [absoluteRoot];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const entryPath = join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules") {
            continue;
          }
          stack.push(entryPath);
          continue;
        }

        if (!/\.(json|tsx?|html|css)$/.test(entry.name)) {
          continue;
        }

        const content = readFileSync(entryPath, "utf8");
        for (const value of starterValues) {
          if (content.includes(value)) {
            findings.push({
              severity: "error",
              category: "starter-identifiers",
              message: `${relative(repoRoot, entryPath)} still contains starter value "${value}"`,
            });
          }
        }

        for (const placeholder of STARTER_PLACEHOLDER_COPY) {
          if (content.includes(placeholder)) {
            findings.push({
              severity: "warning",
              category: "placeholder-copy",
              message: `${relative(repoRoot, entryPath)} still contains placeholder product copy`,
            });
          }
        }
      }
    }
  }

  return findings;
}

function checkNativeMetadata(repoRoot: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const appJsonPath = join(repoRoot, "apps/native/app.json");

  if (!existsSync(appJsonPath)) {
    findings.push({
      severity: "error",
      category: "native-metadata",
      message: "apps/native/app.json is missing",
    });
    return findings;
  }

  const parsed = JSON.parse(readFileSync(appJsonPath, "utf8")) as {
    expo?: {
      name?: string;
      slug?: string;
      scheme?: string;
      ios?: { bundleIdentifier?: string };
      android?: { package?: string };
    };
  };

  const expo = parsed.expo;
  if (!expo?.name || !expo.slug || !expo.scheme) {
    findings.push({
      severity: "error",
      category: "native-metadata",
      message: "Expo name, slug, and scheme must all be set in apps/native/app.json",
    });
  }

  const iosBundle = expo?.ios?.bundleIdentifier;
  const androidPackage = expo?.android?.package;

  if (!iosBundle || !androidPackage) {
    findings.push({
      severity: "error",
      category: "native-metadata",
      message: "Expo iOS bundleIdentifier and Android package must both be set",
    });
  } else if (iosBundle !== androidPackage) {
    findings.push({
      severity: "error",
      category: "native-metadata",
      message: "Expo iOS bundleIdentifier and Android package must match",
    });
  }

  return findings;
}

export function runDoctor(repoRoot: string): { findings: DoctorFinding[]; exitCode: number } {
  const findings: DoctorFinding[] = [];

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (Number.isNaN(nodeMajor) || nodeMajor < MIN_NODE_MAJOR) {
    findings.push({
      severity: "error",
      category: "runtime",
      message: `Node.js ${MIN_NODE_MAJOR}+ is required (detected ${process.versions.node})`,
    });
  } else {
    findings.push({
      severity: "info",
      category: "runtime",
      message: `Node.js ${process.versions.node} detected`,
    });
  }

  try {
    const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
    findings.push({
      severity: "info",
      category: "runtime",
      message: `pnpm ${pnpmVersion} detected`,
    });
  } catch {
    findings.push({
      severity: "error",
      category: "runtime",
      message: "pnpm is not available on PATH",
    });
  }

  for (const envCheck of ENV_FILE_CHECKS) {
    const examplePath = join(repoRoot, envCheck.examplePath);
    const envPath = join(repoRoot, envCheck.envPath);

    if (!existsSync(envPath)) {
      findings.push({
        severity: "error",
        category: "environment",
        message: `Missing ${envCheck.envPath}. Copy ${envCheck.examplePath} and fill in the required keys.`,
      });
      continue;
    }

    if (!existsSync(examplePath)) {
      findings.push({
        severity: "error",
        category: "environment",
        message: `Missing ${envCheck.examplePath} required to validate ${envCheck.envPath}`,
      });
      continue;
    }

    const requiredKeys = parseEnvKeys(readFileSync(examplePath, "utf8"));
    const envKeys = new Set(parseEnvKeys(readFileSync(envPath, "utf8")));
    const missingKeys = requiredKeys.filter((key) => !envKeys.has(key));

    if (missingKeys.length > 0) {
      findings.push({
        severity: "error",
        category: "environment",
        message: `${envCheck.envPath} is missing required keys: ${missingKeys.join(", ")}`,
      });
    }
  }

  findings.push(...scanStarterValues(repoRoot, STARTER_DEFAULTS));
  findings.push(...checkNativeMetadata(repoRoot));

  const packageNames = collectWorkspacePackageNames(repoRoot);
  for (const packageJsonPath of listPackageJsonPaths(repoRoot)) {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>;

    for (const section of ["dependencies", "devDependencies", "peerDependencies"] as const) {
      const deps = parsed[section];
      if (!deps || typeof deps !== "object" || Array.isArray(deps)) {
        continue;
      }

      for (const [dependencyName, version] of Object.entries(deps as Record<string, string>)) {
        if (version === "workspace:*" && !packageNames.has(dependencyName)) {
          findings.push({
            severity: "error",
            category: "workspace",
            message: `${relative(repoRoot, packageJsonPath)} references unresolved workspace dependency ${dependencyName}`,
          });
        }
      }
    }
  }

  const prismaClientPath = join(repoRoot, "packages/db/prisma/generated/client");
  if (!existsSync(prismaClientPath)) {
    findings.push({
      severity: "info",
      category: "database",
      message: "Prisma client is not generated. Run `pnpm run db:generate`.",
    });
  }

  const hasErrors = findings.some((finding) => finding.severity === "error");
  return {
    findings,
    exitCode: hasErrors ? 1 : 0,
  };
}

export function formatDoctorReport(findings: DoctorFinding[]): string {
  const lines: string[] = ["Project doctor", ""];

  const groups: Record<DoctorSeverity, DoctorFinding[]> = {
    error: [],
    warning: [],
    info: [],
  };

  for (const finding of findings) {
    groups[finding.severity].push(finding);
  }

  for (const severity of ["error", "warning", "info"] as const) {
    if (groups[severity].length === 0) {
      continue;
    }

    lines.push(`${severity.toUpperCase()}S:`);
    for (const finding of groups[severity]) {
      lines.push(`  [${finding.category}] ${finding.message}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export async function main(): Promise<number> {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const { findings, exitCode } = runDoctor(repoRoot);
  console.log(formatDoctorReport(findings));

  if (exitCode === 0) {
    console.log("\nAll required checks passed.");
  } else {
    console.log("\nRequired checks failed.");
  }

  return exitCode;
}

if (
  process.argv[1] !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  const exitCode = await main();
  process.exit(exitCode);
}
