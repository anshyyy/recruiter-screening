# recruiter-screening

Monorepo: **Next.js** (`apps/web`) and **NestJS** (`apps/api`), managed with **pnpm** workspaces and **Turborepo**.

## Requirements

- Node.js LTS (v20+ recommended)
- [pnpm](https://pnpm.io/) (this repo pins `packageManager` in the root `package.json`; enable via `corepack enable`)

## Setup

```bash
pnpm install
```

Copy environment examples when you want non-default values:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

## Development

Run both apps in parallel:

```bash
pnpm dev
```

| App    | Directory   | Default URL              |
|--------|-------------|--------------------------|
| Web    | `apps/web`  | http://localhost:3000    |
| API    | `apps/api`  | http://localhost:3001    |

The web app reads `NEXT_PUBLIC_API_URL` (see `apps/web/.env.example`) so the browser and server can target the API. The API enables CORS for `CORS_ORIGIN` (default `http://localhost:3000`).

## Other scripts

```bash
pnpm build   # Turborepo build pipeline
pnpm lint    # ESLint in each app
```
