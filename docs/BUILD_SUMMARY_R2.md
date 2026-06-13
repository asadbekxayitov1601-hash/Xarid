# Xarid — Build Summary (Round 2)

This round shipped a landing redesign, an additive Clerk auth surface, a Cloudflare DNS
runbook, a branded 404 + route loader, and a full build verification. Five agents ran
concurrently; their changes were already consistent on merge — the verifier needed no fixes.

---

## 0. Build status

**`npm run build` PASSES (exit 0).**

The critical acceptance test holds: **the build passes with NO Clerk keys set.** With
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` empty (verified empty in the
shell, `.env`, and `.env.example`), all 17 routes generate — including
`/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`, `/_not-found`, and the pass-through
middleware (90.6 kB). Clerk is reached only via lazy, `webpackIgnore` dynamic imports gated
on both keys, so neither `ClerkProvider` nor `clerkMiddleware` is ever constructed when keys
are absent. As a belt-and-suspenders check, the build **also** passes WITH dummy Clerk keys
(the enabled path resolves Clerk at runtime, never at build). `npx tsc --noEmit` exits 0
(zero type errors).

---

## 1. What landed (per agent)

**Agent 1 — Design research.** Produced `docs/DESIGN_RESEARCH.md`, a copy-pasteable redesign
brief mapping all four inspiration sources onto real Xarid surfaces (landing, header, footer,
hero-3d, catalog card, supplier analytics, Xarid Go tracking). Key calls: standardize on
`motion@12` (no anime.js — banned by DESIGN_SYSTEM §9.9); keep `lucide-react` as the
workhorse with optional two-tone accents; adapt six 21st.dev patterns on existing tokens;
gate every scroll/gesture recipe behind reduced-motion. It also flagged two pre-existing
breakages for Agent 2 to fix first (unwired font vars; inline hex in landing/header).

**Agent 2 — Landing redesign.** Applied the landing redesign per the brief and verified the
build green. (Agent 2 reported no individual file list in its structured output; its work is
reflected in the redesigned `/` route and the green build the verifier confirmed.)

**Agent 3 — Clerk auth + Cloudflare DNS.** Scaffolded Clerk as an additive, env-gated second
auth surface that never touches the existing custom session (`lib/session.ts`) or Telegram
initData auth. New/edited: `lib/clerk.ts` (env-gating + URL helpers + a `linkClerkUserToOrg`
bridge stub), `middleware.ts` (pass-through when keys unset), `components/clerk-gate.tsx`
(conditional `ClerkProvider`), `app/layout.tsx` (surgical wrap), `app/sign-in/[[...sign-in]]/page.tsx`,
`app/sign-up/[[...sign-up]]/page.tsx`, `lib/i18n.ts` (7 `clerk_*` keys ×3 locales),
`package.json` (`@clerk/nextjs ^6.0.0`), `.env.example`, plus `docs/CLERK_AUTH.md`
(coexistence + cutover plan) and `docs/CLOUDFLARE_DNS.md` (DNS runbook for xarid.uz).

**Agent 4 — 404 + loader.** Built a branded, on-brand 404 and a non-trivial route loader.
New: `app/not-found.tsx` and `app/loading.tsx` (server components that resolve locale), plus
`components/ui/not-found-scene.tsx` (immersive pointer-parallax 3D produce scene with ghost
"404", brand mark, and catalog/home CTAs) and `components/ui/fancy-loader.tsx` (Xarid mark +
morphing conic-gradient ring + orbiting produce dots + shimmer wordmark). Both are fully
reduced-motion aware and added 10 `nf_*` / `loader_*` keys to `lib/i18n.ts` ×3 locales.

**Verifier — Build verification.** Confirmed `npm run build` exits 0 both with and without
Clerk keys, `npx tsc --noEmit` exits 0, and exact i18n parity (uz=302, ru=302, en=302). Ran
`npm install` cleanly (no React-19 peer-dep conflicts). No source fixes were required; no
iconsax package was added (the code uses `lucide-react`, already a dependency).

---

## 2. Inspiration mapping

- **Anime.js onScroll** → **Not used by design.** anime.js is banned by DESIGN_SYSTEM §9.9;
  its scroll-driven effects were re-implemented with `motion`'s `useScroll`/`useTransform`,
  each with a reduced-motion gate (see `docs/DESIGN_RESEARCH.md`).
- **Iconsax** → Optional two-tone marketing/analytics accents in the brief; the shipped code
  stays on `lucide-react` (no `iconsax-react` dependency added). Comment drift in
  `landing-client.tsx` mentions "iconsax" but renders lucide — cosmetic only.
- **Motion (motion@12)** → The standard motion engine: `useScroll`/`useTransform` scroll
  recipes on the landing, pointer-parallax in `components/ui/not-found-scene.tsx`, and the
  orbiting/morphing ring in `components/ui/fancy-loader.tsx`.
- **21st.dev** → Six patterns adapted onto existing tokens (bento, marquee, spotlight card,
  segmented tabs, animated counter, aurora) per `docs/DESIGN_RESEARCH.md`, applied in the
  landing redesign.

---

## 3. ⚠️ ACTION REQUIRED FROM YOU (the human) ⚠️

None of the following is needed for the build to pass — the app runs on existing auth and
the current host today. Do these only to **enable Clerk** and/or **move xarid.uz to Cloudflare**.

### A. Clerk env vars (only to turn Clerk on)
1. Create an account + application at **dashboard.clerk.com**.
2. Choose sign-in methods in the Clerk dashboard (email / phone OTP / OAuth). **Phone OTP**
   best mirrors the current UZ UX.
3. Copy these two values and set them in **local `.env`** AND **Vercel → Project → Settings →
   Environment Variables (Production + Preview)**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - (optional, documented in `.env.example`) `NEXT_PUBLIC_CLERK_SIGN_IN_URL`,
     `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
   Until **both** keys are set, Clerk stays inert and `/sign-in` + `/sign-up` render a
   translated "auth not configured" notice pointing to the existing `/auth` flow.
4. If you enable Clerk on the live domain later: add `xarid.uz` (and `www`) to Clerk's
   **allowed Domains**, then add the Clerk-issued CNAMEs (`clerk.`, `accounts.`, `clkmail.`)
   in Cloudflare as **DNS-only (grey cloud)**.

### B. Cloudflare DNS for xarid.uz — follow **`docs/CLOUDFLARE_DNS.md`**
1. Add `xarid.uz` to Cloudflare.
2. **At the .uz registrar**, change the nameservers to the two Cloudflare nameservers
   (registrar-side account action).
3. Create the A/CNAME records for Vercel per the runbook. **Confirm the exact apex A IP and
   www CNAME target** from Vercel → Project → Settings → Domains (Vercel defaults can change).
4. Set SSL to **Full (strict)** and enable **Always Use HTTPS**; set up the `www` redirect.
5. Set `NEXT_PUBLIC_APP_URL` to the canonical `https` host (no trailing slash) in Vercel, and
   point the Telegram **BotFather** domain to the same host after DNS is live.

### C. Database (only for local migrations/seed)
- Production `DATABASE_URL` must be a real **PostgreSQL** string. The local `.env` still uses
  sqlite (`file:./dev.db`) while `prisma/schema.prisma` is `provider = postgresql`. This does
  **not** affect `next build` (no DB at build time), but `prisma db push`/seed against the
  sqlite URL will fail. Set a Postgres URL before running migrations locally.

---

## 4. New dependencies + how to install

- **`@clerk/nextjs ^6.0.0`** — added to `package.json` (the only new dependency).
- **No `iconsax-react`** was added; the UI uses `lucide-react`, already present.
- **`npm install` was already run by the verifier** and resolved cleanly (no React-19
  peer-dep conflicts). If you pull fresh, run `npm install` once to pick up `@clerk/nextjs`.
  - Note: `npm` reported 3 advisories (2 moderate, 1 high) from transitive deps; none block
    the build. Run `npm audit` for detail before a production cut.

---

## 5. i18n keys added + parity

All keys were added to **all three locales** (`uz` / `ru` / `en`) in `lib/i18n.ts`.

- Clerk (7): `clerk_signin_title`, `clerk_signin_subtitle`, `clerk_signup_title`,
  `clerk_signup_subtitle`, `clerk_disabled_title`, `clerk_disabled_body`, `clerk_disabled_cta`
- 404 (6): `nf_code`, `nf_title`, `nf_subtitle`, `nf_cta_catalog`, `nf_cta_home`, `nf_scene_aria`
- Loader (4): `loader_brand`, `loader_label`, `loader_hint`, `loader_aria`

**Final 3-locale parity: uz = 302, ru = 302, en = 302** — identical key sets across all three
(union size 302), verified by the build verifier. Every newly referenced key this round
(`clerk_*`, `nf_*`, `loader_*`, plus the landing `landing_*` / `range_*` keys) is present in
all three locales.

---

## 6. How to view locally

```bash
npm install        # once, to pick up @clerk/nextjs (verifier already ran this)
npm run dev
```

- **`/`** — the redesigned landing (motion scroll recipes, 21st.dev patterns, brand tokens).
- **A deliberately-bad URL, e.g. `/this-page-does-not-exist`** — the branded 404
  (`app/not-found.tsx` → `components/ui/not-found-scene.tsx`): parallax 3D produce scene,
  ghost "404", catalog + home CTAs.
- **`/sign-in`** (and `/sign-up`) — with no Clerk keys, renders the translated "auth not
  configured" notice linking to `/auth`. With keys set, renders the themed Clerk widget.
- **A slow / data-heavy route, e.g. `/supplier/analytics`** — triggers the route-level
  `app/loading.tsx` → `components/ui/fancy-loader.tsx` (morphing ring + orbiting dots) while
  the segment's data resolves.

To preview the enabled Clerk path locally, set dummy or real keys in `.env` and restart `dev`.

---

## 7. Known gaps / follow-ups (de-duplicated)

- **Clerk cutover work (deferred):** implement `lib/clerk.ts:linkClerkUserToOrg()` (currently
  an intentional throwing stub, called nowhere), add a nullable **app-enforced-unique**
  `User.clerkId` column (NO DB `@unique` on the new column), and wire the `/auth/role` picker
  (BUYER/SUPPLIER) into Clerk sign-up via `unsafeMetadata`. See `docs/CLERK_AUTH.md` §6.
- **Middleware size:** the no-keys middleware bundles to 90.6 kB because the Clerk
  matcher/dynamic-import scaffolding is included. It is a functional no-op
  (`NextResponse.next()`); slim the no-keys branch only if cold-start size matters later.
- **Comment drift:** `landing-client.tsx` comments mention "iconsax Bulk icons" but render
  `lucide-react`. Cosmetic only — one-line cleanup.
- **Heavier route loaders:** if a global shell wraps content in Suspense, add nested
  `loading.tsx` files in heavy segments (e.g. `/supplier/analytics` ~114 kB) so `FancyLoader`
  shows during their fetch too. `FancyLoader` accepts `fullscreen={false}` for inline reuse.
- **Stray tree:** a Vite/Dasturkhon-style tree lives under `src/app/*.tsx` in the Xarid repo,
  unrelated to the Next.js surfaces in `app/` + `components/`. Confirm it is intentional/ignored
  before any build cleanup.
- **Audit:** review the 3 `npm audit` advisories before a production cut.
- **DB URL:** local `.env` sqlite vs. `schema.prisma` postgres (see §3.C) — set a Postgres URL
  before local migrations/seed.

---

## 8. Suggested next workflows

1. **"Enable Clerk end-to-end."** I have Clerk keys — add them to `.env` + Vercel, implement
   `linkClerkUserToOrg()` and the nullable app-unique `User.clerkId` column, and wire the
   BUYER/SUPPLIER role picker into Clerk sign-up via `unsafeMetadata`, following
   `docs/CLERK_AUTH.md` §6. Verify the build stays green with keys set.
2. **"Apply the redesign to the remaining surfaces."** Carry the `docs/DESIGN_RESEARCH.md`
   patterns (motion `useScroll`, 21st.dev bento/marquee/spotlight, reduced-motion gates) into
   header, footer, catalog card, supplier analytics, and Xarid Go tracking — and strip any
   remaining inline hex to semantic tokens per DESIGN_SYSTEM §9.2.
3. **"Clean up the repo before a production cut."** Resolve the iconsax comment drift, decide
   the fate of the stray `src/app/*.tsx` Vite tree, triage the 3 `npm audit` advisories, and
   point local `DATABASE_URL` at Postgres so migrations/seed run.
