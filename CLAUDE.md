# Xarid — Agent Guide

**Xarid** ("purchase" in Uzbek) is a **B2C grocery-delivery app for Kokand (Qo'qon),
Uzbekistan** — Yandex-Eats / Lavka style. Customers order everyday groceries; sellers
(shops) fulfil; couriers deliver. Three-sided real-time marketplace.

Stack: **Next.js 15 (app router) + React 19 + Tailwind 4 + Prisma 6 + Motion + Leaflet**.
DB: **Neon Postgres**. Deploy: **Railway** (persistent Node server). Cash on delivery only.

## ⛔ NON-NEGOTIABLE: translate everything
Every user-visible string lives in `lib/i18n.ts` in **all three locales** (`uz`, `ru`, `en`)
and renders via `t(locale, "key")`. A missing key renders raw. When adding/changing any UI,
add the key to **all three** locales in the same change. Uzbek (Latin) + Russian are
first-class; English third.

## Brand / palette (cream + green, light-first)
- Background cream **`#fffdf1`**, accent green **`#59c749`** (secondary `#3da233`).
- **Light is the default theme** (`app/layout.tsx` defaults to `"light"`); dark is the toggle.
- Use **semantic CSS tokens** from `app/globals.css` (`var(--accent)`, `var(--bg-primary)`,
  `var(--text-primary)`, `var(--on-accent)`, `var(--status-*)`), never raw hex in JSX.
- **Text on a green fill must use `var(--on-accent)`** (dark ink) — `var(--bg-primary)` is
  cream and would be unreadable on green. Status colors stay functional (success = teal).

## Git workflow (every change)
- branch → `NODE_ENV=production npx next build` (must be **green with NO Clerk keys**) →
  `tsc --noEmit` clean → commit → open PR via `gh` → squash-merge → `git checkout main &&
  git pull --ff-only` → delete branch.
- **ASCII only** in code identifiers, file paths, and commit/PR titles/bodies.
- Trailers: `Co-Authored-By: Claude ...` on commits; 🤖 line on PR bodies.

## Backend gotchas
- **Single Postgres schema** (`prisma/schema.prisma`, provider `postgresql`). After schema
  edits run `npx prisma generate`; apply with `npx prisma db push` (additive + nullable only —
  never destructive on the live DB). `lib/db.ts` is a `globalThis` singleton.
- **`DATABASE_URL`** = Neon **pooled** string, `?sslmode=require` **without** `channel_binding`
  (PgBouncer + Prisma rejects channel binding). Same DB for local + Railway.
- **Clerk was REMOVED** — do not reintroduce it. Auth is custom phone+password sessions
  (`lib/session.ts`) + Telegram initData. Two account types at signup: **buyer** (consumer)
  and **seller** (creates a `SUPPLIER` Organization) — `app/api/auth/credentials/route.ts`.
- **No new payment gateways** — cash on delivery only.

## Architecture (three-sided marketplace)
- **Customer** = buyer (catalog, basket, `/orders`, `/track/[id]`).
- **Seller** = `Organization` type `SUPPLIER` → `/supplier` portal (dashboard, analytics,
  products, profile) in `components/supplier/SupplierShell.tsx`. `requireSupplier()` gates it.
- **Courier** = `User` role `DRIVER` + `Driver` → `/driver`; `/admin/dispatch` oversees.
- Order flow is feature-complete: geocoding + **auto-dispatch** (`lib/dispatch.ts`), **dynamic
  delivery fee + surge** (`lib/delivery-pricing.ts`, `lib/surge.ts`), **real-time tracking over
  SSE** (`lib/realtime.ts`, `/api/orders/[id]/stream`, 10s poll fallback).
- Read `docs/MARKETPLACE_ARCHITECTURE.md` (map + status), `PRICING_ENGINE.md`, `REALTIME.md`,
  `DEPLOY_RAILWAY.md` first.

## Deploy
- **Railway** (persistent server — SSE works here, unlike Vercel serverless). Production
  branch must be **`main`**; env vars set in the Railway dashboard, then redeploy.
- `/api/health` reports DB + env status. App is **feature-complete, pre-launch**.

## Roadmap (remaining)
1. **Vendor prep-time** — explicit accept/reject feeding dispatch timing.
2. **Capacity-aware dispatch** — transport type + order size (foot/scooter can't batch bulky
   grocery orders the way a car can), not just distance.
3. **Partner Pull/Push API** — Client ID/Secret + JSON for sellers with their own POS.
