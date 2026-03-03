# AGENTS.md - apps/web

## Purpose

`apps/web` is the Next.js App Router frontend for AionChat.

## Core stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma client for persistence access

## Key files

- `src/app/layout.tsx` - root layout and metadata
- `src/app/page.tsx` - placeholder app shell page
- `src/app/globals.css` - global styles and dark-mode defaults
- `src/lib/env.ts` - typed environment variable access
- `src/lib/prisma.ts` - PrismaClient singleton
- `src/lib/utils.ts` - `cn()` helper

## Rules

- Keep UI dark-mode only.
- Use `prisma` singleton from `src/lib/prisma.ts`.
- Do not commit `.env` files.

## Validation

- `pnpm --filter web dev`
- `pnpm --filter web typecheck`
- `pnpm --filter web lint`
