# Catalog 500 — diagnosis and fix

## Symptom

Opening `/catalog` in production shows **"Application error: a client-side
exception has occurred"** (or a server 500 with a `Digest`), and `/api/health`
may also fail. The page never renders products.

## Root cause

`app/catalog/page.tsx` is a `force-dynamic` server component that runs
`prisma.product.findMany()` on every request. There is **no reachable Postgres
database**, so that query throws and Next.js renders a raw error screen.

The error thrown is a `PrismaClientInitializationError`:

```
Invalid `prisma.product.findMany()` invocation:
error: Error validating datasource `db`: the URL must start with the protocol
`postgresql://` or `postgres://`.
```

This happens in any of these situations:

1. **`DATABASE_URL` is not set** in the deployment environment (Vercel).
2. **`DATABASE_URL` points at the wrong thing** — e.g. a local `.env` still has
   `DATABASE_URL="file:./dev.db"` (a SQLite URL) while `prisma/schema.prisma`
   declares `provider = "postgresql"`. The Postgres engine rejects the SQLite
   URL at connect time. **This is the current local repro.**
3. **The schema was never pushed** — `DATABASE_URL` is a valid Postgres URL but
   the tables (`Product`, `SupplierOffer`, …) do not exist yet.
4. **The catalog is empty** — tables exist but no products/offers were seeded.

> This is a **USER / infra action**, not a code bug. The code cannot show
> products without a database. What the code now does is **fail gracefully**.

## What the code now does (already shipped)

- `app/catalog/page.tsx` wraps the Prisma query in `try/catch`. On failure it
  renders the catalog with an empty list and a `dbError` flag instead of
  throwing.
- `components/catalog-client.tsx` renders a calm, translated panel:
  - **DB unreachable** → "Catalog temporarily unavailable" + a Try-again button.
  - **DB reachable but empty** → "The catalog is empty for now".
- `app/error.tsx` + `app/global-error.tsx` are translated route/top-level error
  boundaries with a retry button — users never see a raw 500 anywhere.
- `app/api/health/route.ts` is hardened: it **always returns HTTP 200** with a
  JSON diagnosis (`db: "ok" | "error" | "unconfigured"`, which env vars are
  missing, whether tables exist, product/supplier counts, and `hints`).

## The real fix (user steps)

### 1. Provision a Postgres database (Neon)

1. Create a project at <https://neon.tech> (free tier is fine).
2. Copy the **pooled** connection string (Neon → Dashboard → Connection
   Details → "Pooled connection"). It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.eu-central-1.aws.neon.tech/DB?sslmode=require
   ```

   On Vercel (serverless) you MUST use the **pooled** URL, not the direct one.

### 2. Set `DATABASE_URL`

- **Locally:** edit `.env` so it is a real Postgres URL (NOT `file:./dev.db`):

  ```
  DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.../DB?sslmode=require"
  ```

- **On Vercel:** Project → Settings → Environment Variables → add
  `DATABASE_URL` for Production (and Preview), then **redeploy**. Env var
  changes do not take effect until a new deployment.

### 3. Push the schema

From the repo root, with `DATABASE_URL` pointing at the new database:

```
npx prisma db push
```

This creates all the tables defined in `prisma/schema.prisma`.

### 4. Seed the catalog

Either run the seed locally:

```
npm run db:seed
```

…or, on a deployment where you cannot run the CLI, open this URL in a browser
(it creates the schema if missing **and** seeds the demo catalog, idempotently):

```
https://<your-app>/api/setup?key=<ADMIN_PASSWORD>
```

`ADMIN_PASSWORD` must be set in the environment for `/api/setup` to work.

### 5. Redeploy and verify

After setting env vars on Vercel, trigger a redeploy, then check health.

## How to read `/api/health`

Open `https://<your-app>/api/health`. It always returns HTTP 200. Key fields:

| Field          | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `db`           | `"ok"` connected · `"error"` unreachable · `"unconfigured"` no DATABASE_URL |
| `tables`       | `true` once the schema has been pushed                                  |
| `products`     | number of catalog products (0 ⇒ needs seeding)                          |
| `suppliers`    | number of supplier organizations                                        |
| `env`          | which env vars are **present** (booleans only — never the values)       |
| `missingEnv`   | names of required env vars that are not set                             |
| `hints`        | human-readable next steps                                               |

**Expected healthy response:** `db: "ok"`, `tables: true`, `products > 0`,
`hints: ["All good."]`.

Typical progression while fixing:

1. `db: "unconfigured"` → set `DATABASE_URL`, redeploy.
2. `db: "error"` → wrong/unreachable URL (check protocol is `postgresql://`,
   use the **pooled** Neon URL on Vercel).
3. `db: "ok"`, `tables: false` → run `npx prisma db push` (or `/api/setup`).
4. `db: "ok"`, `tables: true`, `products: 0` → run `npm run db:seed` (or
   `/api/setup?key=<ADMIN_PASSWORD>`).
5. `db: "ok"`, `tables: true`, `products > 0` → catalog renders. Done.
