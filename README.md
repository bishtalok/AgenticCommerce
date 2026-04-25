# Boots ROI — Travel Mission (Agentic Commerce Prototype)

A Next.js prototype of a **Travel Mission Shopping Agent** for Boots Ireland. The agent clarifies intent via 2–5 safe questions, generates a governed travel kit (bundle), checks store availability, and completes a simulated "Buy-in-Chat" checkout with an explicit consent mandate.

> **Agent behaviour is deterministic** (keyword + rules). No LLM / external API keys required to run.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** + **Radix**
- **Zustand** (client state, persisted to `localStorage`)
- **Prisma** + **Postgres** (Neon in production)
- **Vitest** for unit tests
- **GitHub Actions** for CI

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then set:

- `DATABASE_URL` — a Postgres connection string. Easiest path: sign up for a free [Neon](https://neon.tech) database and copy the pooled connection string.
- `SESSION_SECRET` — generate with `openssl rand -hex 32`.

### 3. Initialise the database

```bash
npm run db:push     # create tables from prisma/schema.prisma
npm run db:seed     # load /data fixtures (products, stores, inventory, mission config)
```

### 4. Run the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest unit tests |
| `npm run test:coverage` | Tests + v8 coverage report |
| `npm run db:push` | Push Prisma schema to the DB |
| `npm run db:seed` | Seed fixtures |
| `npm run db:studio` | Launch Prisma Studio |

## Project layout

```
app/                 # Next.js App Router pages + API routes
components/          # UI components (chat, bundle, checkout, shared, ui/shadcn)
domain/              # Pure-logic agent & fulfilment rules (no I/O)
  agent/             #   intent, questionFlow, planBuilder, bundleBuilder, substitution, policyEngine
  fulfilment/        #   fulfilment recommender
services/            # DB-backed services (catalog, availability, cart, checkout, consent, audit)
lib/                 # db, session, rateLimit, errors, zodSchemas
stores/              # Zustand stores
data/                # Mock fixtures (products, stores, inventory, missions)
prisma/              # schema, migrations, seed
tests/               # Vitest unit tests (agent + services)
```

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import into [Vercel](https://vercel.com/new) — it auto-detects Next.js.
3. Add `DATABASE_URL` and `SESSION_SECRET` as Vercel environment variables (use the Neon connection string).
4. Trigger a first deploy. Vercel will run `next build`, then `prisma generate` in the build step.
5. After first deploy, run a one-off seed against the Neon DB: `DATABASE_URL=... npm run db:push && npm run db:seed`.

## Mission flow (user journey)

1. Visit `/` → click "Start travel mission".
2. Agent asks 2–5 questions (destination, duration, traveller, sensitivities, urgency).
3. Bundle panel renders with ≥ 6 items, each with a "why added" chip.
4. Adjust bundle (remove, change price band, exclude categories).
5. Pick Click & Collect (with store) or Delivery.
6. Review totals → confirm explicit **Consent Mandate** (30-min TTL).
7. Order confirmation with a `ROI-TRV-*` reference.

## Compliance & guardrails

- Non-clinical copy only. Disclaimer banner: *"Not medical advice. Speak to a pharmacist."*
- `child` / `family` traveller filters out tag `restricted_for_children` SKUs.
- Every agent decision writes an `AuditEvent` row for traceability.
- Session cookie: `HTTP-only`, `SameSite=Lax`, `__Secure-` prefix in production.
