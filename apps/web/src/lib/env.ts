import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  OPENROUTER_API_KEY: required("OPENROUTER_API_KEY"),
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://aionchat:aionchat@localhost:5434/aionchat",
  PORT: process.env.PORT ?? "3122",
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
