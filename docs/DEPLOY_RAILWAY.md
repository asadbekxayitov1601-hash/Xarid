# Deploying Xarid to Railway

Xarid runs on Railway as a normal Next.js server (persistent, not serverless).
Railway is a good fit because the server is always on, so the in-process
scheduler (`lib/scheduler.ts` — the 22:00 cutoff and 23:30 reminder) works with
no external cron.

The database stays on **Neon** (Postgres), exactly as it is for Vercel. Railway
and Vercel can point at the **same** Neon `DATABASE_URL` and share data, or you
can use a separate Neon database for Railway — your choice.

This repo is already Railway-ready:

- `railway.json` — pins the Nixpacks builder + `npm run start`.
- `.nvmrc` (`20`) — pins Node 20 (Next 15 / React 19 need Node >= 18.18).
- `package.json` `start` script runs `next start`, which binds to `0.0.0.0` and
  reads Railway's injected `PORT` automatically.
- `postinstall` runs `prisma generate` during the build (on Railway's Linux), so
  the correct Prisma engine is generated for the deploy platform.

## One-time deploy steps (Railway dashboard)

1. Go to https://railway.app -> **New Project** -> **Deploy from GitHub repo**.
2. Pick `asadbekxayitov1601-hash/Xarid`, branch **`main`**. Railway detects
   Next.js (Nixpacks): build `npm run build`, start `npm run start`.
3. Open the service -> **Variables** and add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon **pooled** connection string (same one used on Vercel), e.g. `postgresql://...-pooler.../neondb?sslmode=require` |
   | `SESSION_SECRET` | Any long random string |
   | `ADMIN_PASSWORD` | Password for `/admin` |
   | `NEXT_PUBLIC_APP_URL` | The public Railway URL (set this in step 5, then redeploy) |
   | `TELEGRAM_BOT_TOKEN` | From @BotFather (optional, for the Telegram Mini App) |
   | `ADMIN_TELEGRAM_ID` | Optional — receives the 23:30 unconfirmed-PO summary |
   | `CRON_SECRET` | Optional — protects `/api/cron/*` |

4. **Settings -> Networking -> Generate Domain.** Railway gives a public URL like
   `https://xarid-production-XXXX.up.railway.app`.
5. Set **`NEXT_PUBLIC_APP_URL`** to that exact URL (no trailing slash), then
   **redeploy** (this var is inlined at build time, so it must be set before the
   build that serves users).

## Database

The Neon database is already created (schema pushed) and seeded with the grocery
catalog. Because Railway uses the **same** Neon `DATABASE_URL`, there is nothing
more to run — the catalog and orders are already there.

If you instead want Railway to use its **own** Neon database, set `DATABASE_URL`
to that database, then run once (locally, with that URL):

```bash
DATABASE_URL="<the-new-neon-url>" npx prisma db push
DATABASE_URL="<the-new-neon-url>" npm run db:seed
```

(Or, after deploy, open `https://<railway-domain>/api/setup?key=<ADMIN_PASSWORD>`
once — it creates the tables and seeds the demo catalog, idempotently.)

## Verify

- `https://<railway-domain>/api/health` -> JSON with `"db":"ok"` and
  `products > 0`.
- `https://<railway-domain>/` -> the purple B2C grocery storefront.
- `https://<railway-domain>/auth` -> "Sign up" tab shows the Buyer / Seller
  account-type choice.

## Notes

- **Scheduling**: on Railway the 22:00 cutoff + 23:30 reminder run automatically
  via the in-process scheduler. Set `DISABLE_CUTOFF_SCHEDULER=1` only if you run
  the cutoff via an external cron instead. (`vercel.json` crons are ignored by
  Railway — that's fine.)
- **Clerk**: removed from the app; no Clerk env vars are needed.
- **Payments**: cash on delivery only; no payment-gateway env vars are required.
