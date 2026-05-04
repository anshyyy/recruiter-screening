# Recruiter screening

Monorepo for a **recruiter-style candidate flow**: browse jobs, apply (with résumé and contact details), complete an **AI phone screening** (via [Bolna](https://bolna.ai)), and—after passing a configurable score—**book a technical interview** from recruiter-configured time slots. The stack is **Next.js** (`apps/web`) and **NestJS** (`apps/api`), with **PostgreSQL** and optional **AWS S3** for file storage.

| Package   | Role |
|-----------|------|
| `apps/web` | Next.js 16 / React 19 UI, talks to the API via `NEXT_PUBLIC_API_URL`. |
| `apps/api` | NestJS 11 REST API, TypeORM, JWT auth, Bolna + optional LLM scoring. |

**Documentation**

- **[Backend architecture](docs/BACKEND_ARCHITECTURE.md)** — modules, data model, integrations, security, and API conventions (detailed).

---

## Requirements

- **Node.js** LTS (v20+ recommended)
- **[pnpm](https://pnpm.io/)** — the repo pins `packageManager` in the root `package.json`; enable with:

  ```bash
  corepack enable
  ```

- **Docker** (optional but recommended) — for local PostgreSQL via `docker-compose.yml`

---

## Quick start

### 1. Install dependencies

From the repository root:

```bash
pnpm install
```

### 2. PostgreSQL

Either use your own Postgres instance or start the bundled one (maps host **5433** → container **5432** to avoid clashing with a local Postgres on 5432):

```bash
docker compose up -d postgres
```

Connection defaults match `apps/api/.env.example` (`DATABASE_URL` uses port **5433**).

### 3. Environment files

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Edit as needed:

- **Web** — `NEXT_PUBLIC_API_URL` must include the API global prefix, e.g. `http://localhost:8080/api`.
- **API** — At minimum set `DATABASE_URL`, `JWT_SECRET`, and—if you use uploads—`AWS_*` / `S3_BUCKET` per `.env.example`. For screening calls, configure **Bolna** variables (`BOLNA_API_KEY`, `BOLNA_SCREENING_AGENT_ID`, etc.).

**Env load order (API)** — `@nestjs/config` loads (later wins for each key): `apps/api/.env.local` → `apps/api/.env` → **monorepo root** `.env`. Plain Node does not load `.env` automatically; the API explicitly merges these files.

### 4. Run both apps

```bash
pnpm dev
```

| App | Directory    | Default URL |
|-----|--------------|-------------|
| Web | `apps/web`   | http://localhost:3000 |
| API | `apps/api`   | http://localhost:8080/api |

- **Swagger UI**: http://localhost:8080/api/docs  
- **Health**: http://localhost:8080/api/health  

The API enables **CORS** for `CORS_ORIGIN` (default `http://localhost:3000`).

### 5. Database seed (jobs)

On API startup, `SeedService` runs `JobsSeeder.seedIfEmpty()` so you get sample **jobs** if the `jobs` table is empty. If the DB was down on first boot, fix connectivity and **restart the API** to retry seeding.

You can also run the seed script after a build (see `apps/api/package.json` `seed` script) if you use that workflow.

---

## Useful scripts (root)

| Command        | Description |
|----------------|-------------|
| `pnpm dev`     | Turborepo: `dev` in all apps (web + API in parallel). |
| `pnpm build`   | Production build for all apps. |
| `pnpm lint`    | ESLint in each app. |
| `pnpm format`  | Prettier for common file types. |

**API-only** (from `apps/api`):

- `pnpm dev` — `nest start --watch`
- `pnpm build` / `pnpm start:prod` — production

**Web-only** (from `apps/web`):

- `pnpm dev` / `pnpm build` / `pnpm start`

---

## Overview of the product flow

1. **Auth** — Register/login; JWT returned to the client; profile update can attach résumé metadata after upload.
2. **Jobs** — Public listing; authenticated users **apply** to a job (snapshots skills, résumé pointers, phone for dialing).
3. **Uploads** — Authenticated multipart upload to **S3** (public-read objects; bucket/policy requirements are documented in `apps/api/.env.example`).
4. **Screening** — For each application, a **screening session** tracks Bolna outbound calls, transcripts, optional LLM-derived scoring, and pipeline transitions (pass / reject thresholds from env).
5. **Webhooks** — Bolna calls `POST /api/screening/webhook` (unauthenticated; **restrict at the edge** by IP or network policy—see env comments).
6. **Technical interviews** — After screening pass, candidates can **confirm** a slot from `TECH_INTERVIEW_AVAILABLE_SLOTS_JSON` (and related Bolna scheduling options).

For module-level detail, request/response shape, and diagrams, see **[docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md)**.

---

## Troubleshooting

- **Web cannot reach API** — Check `NEXT_PUBLIC_API_URL` includes `/api` and matches the API port; check `CORS_ORIGIN` on the API.
- **DB connection errors** — Confirm Postgres is up, `DATABASE_URL` host/port match (5433 for the compose file), and credentials match `docker-compose.yml`.
- **S3 errors** — Ensure both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set together if you use static keys; see `.env.example` for MinIO-style `S3_ENDPOINT`.
- **Screening / Bolna** — Verify `BOLNA_*` keys and agent IDs; register the public webhook URL in the Bolna dashboard as documented in `.env.example`.

---

## Repository layout

```text
apps/
  web/          # Next.js frontend
  api/          # NestJS backend
docs/           # Engineering docs (e.g. backend architecture)
docker-compose.yml
package.json    # pnpm workspace root
pnpm-workspace.yaml
turbo.json
```

---

## License

Private / UNLICENSED unless otherwise stated in subpackages.
