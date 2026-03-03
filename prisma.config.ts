import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "infra/schema.prisma",
  migrations: {
    path: "infra/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
