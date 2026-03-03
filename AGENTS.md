# AGENTS.md - AionChat Repository Rules

## Project overview

AionChat is a roleplay-focused chat application. The initial implementation targets a clean monorepo scaffold with a Next.js web app, Prisma-backed persistence, and local Postgres via Docker Compose.

## Workspace layout

```text
aionchat/
|- apps/web/             # Next.js app (App Router)
|- infra/                # Prisma schema, migrations, docker-compose
|- pnpm-workspace.yaml
|- package.json
|- tsconfig.base.json
|- tsconfig.json
|- eslint.config.mjs
|- prisma.config.ts
|- .env.example
```

## Conventions

- Use pnpm workspaces.
- Keep TypeScript strict mode enabled.
- Keep `noUncheckedIndexedAccess` enabled.
- Use Prisma schema from `infra/schema.prisma`.
- Keep app styling dark-mode only.
- Do not commit `.env` files.

## Validation commands

- `pnpm install`
- `pnpm infra:up`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm dev`
