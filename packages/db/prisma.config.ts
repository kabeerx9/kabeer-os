import path from "node:path";

import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Use direct connection for CLI (db push, migrate, studio).
    // Runtime Prisma Client uses the pooled DATABASE_URL via the pg adapter.
    url: env("DIRECT_URL"),
  },
});
