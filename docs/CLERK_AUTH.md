# Clerk Auth — Coexistence & Migration Plan (Agent 3)

Status: **scaffolded, NOT primary.** Clerk is wired in as an *additive,
env-gated* second auth surface. With the Clerk keys unset, the app builds, runs,
and authenticates exactly as it does today. Nothing about the existing auth
changes until the user explicitly performs the cutover in section 6.

This document is the single source of truth for how Clerk coexists with Xarid's
current auth, how a Clerk identity maps onto our data model, and the exact steps
to make Clerk primary when the user is ready.

---

## 1. What Xarid has today (do not break)

Two independent auth paths already work and stay working:

1. **Phone + password sessions** — `app/api/auth/credentials/route.ts` validates
   phone/password, then `lib/session.ts:setSession(userId)` writes a signed
   (`HMAC-SHA256`) httpOnly cookie `xarid_session`. `getSessionUserId()` reads it
   back. The UI is `components/auth-client.tsx` at route `/auth`.
2. **Telegram Mini App** — `app/api/auth/telegram/route.ts` verifies Telegram
   `initData` (HMAC with `TELEGRAM_BOT_TOKEN`) and issues the same session
   cookie. This is how users inside the Telegram webview sign in silently.

The session cookie is the app's source of truth everywhere (layout, server
components, API routes). **Clerk does not touch this cookie.**

---

## 2. How Clerk is gated (the safety contract)

Everything keys off `lib/clerk.ts`:

| Helper | Reads | True when |
|---|---|---|
| `isClerkEnabled()` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | both set (server) |
| `isClerkPublishableConfigured()` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | publishable set (client-safe) |

The four touch points and their no-key behavior:

| File | Keys present | Keys UNSET (default) |
|---|---|---|
| `middleware.ts` | lazily imports `@clerk/nextjs/server`, runs `clerkMiddleware()` | returns `NextResponse.next()` — pure pass-through |
| `app/layout.tsx` → `components/clerk-gate.tsx` | wraps tree in `<ClerkProvider>` | renders children unwrapped |
| `app/sign-in/[[...sign-in]]/page.tsx` | renders Clerk `<SignIn/>` | renders a translated "not configured" notice linking to `/auth` |
| `app/sign-up/[[...sign-up]]/page.tsx` | renders Clerk `<SignUp/>` | same notice |

**Why both keys for `isClerkEnabled()`:** a publishable key without a secret key
would render a widget that can't complete a sign-in. We never half-enable.

**Why lazy `import()` everywhere:** the `@clerk/nextjs` package is declared in
`package.json` but the dynamic, variable-specifier import (`const pkg =
"@clerk/nextjs"; await import(pkg)`) means a missing or not-yet-installed package
fails *open* to the existing auth instead of crashing the build.

### Acceptance test (must stay green)

```bash
# With NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY unset:
npm run build   # succeeds
npm run dev     # /auth works, /sign-in and /sign-up show the fallback notice
```

---

## 3. Env vars

| Var | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client + server | turns the Clerk UI on; inlined at build time |
| `CLERK_SECRET_KEY` | server only | required for Clerk middleware / backend calls |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | client | sign-in route, default `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | client | sign-up route, default `/sign-up` |

Get the keys from **dashboard.clerk.com → your app → API Keys**. Add them in:
- local: `.env` (see `.env.example` for the documented block)
- Vercel: Project → Settings → Environment Variables (Production + Preview)

---

## 4. Mapping a Clerk user → our `Organization` / `User` + role

Our data model (see `prisma/schema.prisma`):

- `User` — `id`, optional `phone @unique`, optional `telegramId @unique`,
  `passwordHash`, `role` (`OWNER | STAFF | ADMIN | DRIVER`), `orgId`.
- `Organization` — `type` (`BUYER | SUPPLIER`), `name`, `district`, `phone`,
  `about?`, `logoUrl?`.

A Clerk identity has none of our domain fields (role, org, district). So linking
is a **bridge**, not a replacement. The seam is `lib/clerk.ts:linkClerkUserToOrg`
(currently a typed stub that throws). When implemented it will:

1. Receive `{ clerkUserId, email?, phone?, fullName?, role? }`.
2. Look up an existing `User`:
   - by `phone` (normalized via `lib/password.ts:normalizePhone`) when Clerk
     provides a verified phone — this lets a Clerk sign-in *claim* an account
     already created at checkout, preserving order history (same idea as the
     existing credentials "claim" flow).
   - otherwise create a new `User`.
3. Store the Clerk linkage. **Schema note:** add a nullable, app-enforced-unique
   `clerkId String?` column to `User` (do NOT add a DB `@unique` on a new column
   on live data — the project guide warns this can break `db push`; enforce
   uniqueness in app logic, mirroring how `googleId`/`telegramId` are handled).
4. If the user picked a role on the role picker (`/auth/role`, see
   `docs/ACCOUNTS.md`), create the matching `Organization` (`type = BUYER |
   SUPPLIER`) and attach the user as `OWNER` — identical to the credentials
   signup branch.
5. Issue **our** session cookie via `setSession(user.id)` so the rest of the app
   (which only knows the `xarid_session` cookie) works unchanged. Clerk becomes
   the *front door*; our session stays the *internal key*. This is the lowest-risk
   bridge: no server component, API route, or guard has to learn about Clerk.

Role gating (`requireBuyer` / `requireSupplier` / `requireDriver` /
`requireAdmin`, per `docs/ACCOUNTS.md` §4) is unaffected — it reads `User.role`
and `Organization.type`, both populated by the bridge above.

### Telegram stays separate

Telegram auth (`app/api/auth/telegram/route.ts`) is **not** routed through Clerk.
Inside the Telegram Mini App webview we authenticate with `initData` and issue
our session cookie directly. Clerk's hosted UI is for the standalone web app at
`xarid.uz`, not the embedded webview. Keep these two paths independent; a user
may have both a `telegramId` and a `clerkId` on the same `User` row.

---

## 5. What's scaffolded vs. what needs the user

**Done (no keys needed):**
- `lib/clerk.ts` env helpers + bridge stub.
- `middleware.ts` pass-through / Clerk delegation.
- `components/clerk-gate.tsx` conditional `<ClerkProvider>`.
- `app/sign-in` + `app/sign-up` catch-all routes with translated fallback.
- `@clerk/nextjs` in `package.json` (installed by the verify phase).
- `.env.example` documented.
- i18n keys `clerk_*` in uz/ru/en.

**Needs the user (cannot finish without real input):**
- Clerk account + application created at dashboard.clerk.com.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` added to `.env` and
  Vercel.
- Decision on which sign-in methods to enable in the Clerk dashboard (email,
  phone OTP, OAuth). For Uzbekistan, phone OTP mirrors the current UX best.
- Clerk **allowed domains** set to the production host (see
  `docs/CLOUDFLARE_DNS.md` §"Clerk interaction").
- Implementation sign-off for `linkClerkUserToOrg` + the `clerkId` column (only
  when the user wants Clerk to actually create/claim accounts).

---

## 6. Cutover steps (when the user is ready to make Clerk primary)

Do these in order; each step is independently reversible by unsetting the keys.

1. **Enable Clerk UI.** Add both keys to `.env` + Vercel. `/sign-in` and
   `/sign-up` now render Clerk widgets; the layout wraps in `<ClerkProvider>`;
   middleware runs `clerkMiddleware()`. The existing `/auth` still works in
   parallel — nothing is removed yet.
2. **Add the linkage column.** `User.clerkId String?` in `prisma/schema.prisma`,
   then `npx prisma db push` (additive, nullable — safe on live Postgres).
3. **Implement the bridge.** Fill in `lib/clerk.ts:linkClerkUserToOrg` per §4 and
   call it from a Clerk webhook or an `afterSignIn`/`afterSignUp` handler that
   then calls `setSession(user.id)`.
4. **Pipe the role picker.** Pass the chosen `BUYER | SUPPLIER` from
   `/auth/role` into the Clerk sign-up flow (Clerk `unsafeMetadata.role`), read
   it back in the bridge.
5. **Protect routes (optional).** Add a route-protection callback to
   `clerkMiddleware()` only for routes you want Clerk to gate. Leave `/catalog`
   public (per `docs/ACCOUNTS.md`). Keep our `require*` guards as the
   authoritative server-side check regardless.
6. **Redirect the old entry point.** Once Clerk is the front door, change the
   header's "Sign in" link to `/sign-in` and make `/auth` redirect there (or keep
   `/auth` as a phone-only fallback for the Telegram webview).
7. **Telegram untouched.** Do not route the Mini App through Clerk; it keeps
   using `initData` → `setSession`.

**Rollback:** unset the two Clerk keys. Middleware reverts to pass-through, the
provider unwraps, `/sign-in` + `/sign-up` show the fallback notice, and the app
runs on the original auth. The `clerkId` column is nullable and harmless if left
in place.
