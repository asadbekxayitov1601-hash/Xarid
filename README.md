# Xarid — Morning Procurement Marketplace for HoReCa

**Xarid** (Uzbek: "purchase") is a B2B marketplace where restaurants, cafes, and
chaikhanas place their entire morning supply order — vegetables, meat, dairy,
dry goods — across vetted suppliers in one basket, with transparent prices and
consolidated delivery before lunch prep.

**The problem it replaces:** the 6 a.m. ritual of calling ten suppliers,
haggling over the phone, and hoping the truck shows up before service.

## How it works

1. **Evening (until 22:00):** the buyer builds one basket from multiple
   suppliers' price lists and confirms the order.
2. **Night:** suppliers confirm availability; the system consolidates orders
   into delivery routes by zone.
3. **Morning (06:00–10:00):** Xarid's own delivery fleet picks up from
   suppliers and delivers everything in one drop before lunch prep.

## Revenue model

- 5–10% take rate on order value, and/or supplier-side subscription
- Delivery fees
- Later: supplier financing on receivables (factoring, with a bank/MFO partner)

## Proven analogs

- **Choco** (Berlin, EU/US) — chat-first ordering between restaurants and suppliers
- **REKKI** (UK) — chat-based supplier ordering app
- **Jumbotail** (India) — B2B food & grocery marketplace with own logistics
- **Choco Family / Ryadom** (Kazakhstan) — regional proof that food
  marketplace + own logistics works in Central Asia

## Architecture: one codebase, two surfaces

The same Next.js app serves both:

1. **The website** (`xarid.uz`) — landing page, catalog, basket, orders in any browser.
2. **The Telegram Mini App** — the identical app opened inside Telegram via the
   bot's menu button. Telegram users are authenticated automatically (initData
   HMAC validation), no login screen.

This means zero duplicated work: every feature ships to web and Telegram at once.

## Running locally

```bash
npm install
cp .env.example .env        # defaults work for local dev
npx prisma db push          # create SQLite dev database
npx prisma db seed          # ~30 SKUs, 4 suppliers
npm run dev                 # http://localhost:3000
```

## Connecting the Telegram Mini App (after deploying)

1. Create a bot with [@BotFather](https://t.me/BotFather), put the token in
   `TELEGRAM_BOT_TOKEN`, set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS URL.
2. Register the webhook:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/bot`
3. In BotFather: **Bot Settings → Menu Button** → set the URL to
   `<APP_URL>/catalog`. `/start` also replies with an "open app" button.
4. In production switch `prisma/schema.prisma` provider to `postgresql` and
   point `DATABASE_URL` at Supabase/Neon.

## Repository structure

| Path | Purpose |
|---|---|
| `docs/PLAN.md` | Master build plan: phases, files, technical details |
| `docs/BUSINESS_PLAN.md` | Personal (founder's) business plan — working document, not an investor deck |
| `docs/LOGISTICS.md` | Design of the in-house delivery operation |

## Status

**Phase 1 core complete.** Built: landing page with lead capture (UZ),
catalog with transparent best-price-per-SKU, multi-supplier basket, order
placement with server-side price verification, order history, Telegram Mini
App auth + bot webhook, supplier confirmation via Telegram (one-tap
confirm/reject), 22:00 cutoff cron splitting baskets into per-supplier
purchase orders, and an admin panel (`/admin`: dashboard, orders pipeline,
supplier & price-list management, printable morning route sheet).
Next: deploy, onboard real suppliers, then Phase 2 logistics — see
`docs/PLAN.md`.
