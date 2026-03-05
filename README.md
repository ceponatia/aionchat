# AionChat

Quick start instructions for running local infrastructure and the web server.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (with Docker Compose)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment variables

Create an env file for the web app and set at least `OPENROUTER_API_KEY`.

```bash
cp .env.example apps/web/.env.local
```

## 3. Start infrastructure (Postgres)

```bash
pnpm infra:up
```

This starts Postgres using `infra/docker-compose.yml`.

## 4. Start the web server

```bash
pnpm dev
```

The app runs on `http://localhost:3122` by default.

## 5. Stop infrastructure

```bash
pnpm infra:down
```
