import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

import { defineConfig } from "prisma/config";

const envPaths = [
  path.resolve(".env"),
  path.resolve("apps/web/.env"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

export default defineConfig({
  schema: "infra/schema.prisma",
  migrations: {
    path: "infra/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
