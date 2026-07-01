# Xarid — Web/API Security Review (white-box)

**Scope:** Next.js API routes, custom session/auth, admin surface, and the two
Flutter clients on branch `feat/driver-app-and-support`. Authorized white-box
review of the owner's own application. **No active scanning was run against the
live production database** — this is a code-level audit mapped to OWASP WSTG.

**Date:** 2026-07-01 · **Method:** manual source review (auth, access control,
injection, business logic, session, secrets).

## Risk summary

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| WEB-001 | High | `SESSION_SECRET` dev fallback → forgeable session tokens | **Fixed** |
| WEB-002 | Medium | Bearer session tokens carry no expiry | Recommendation |
| WEB-003 | Low | No rate limiting on `/api/auth/token` and `/api/support` | Recommendation |
| WEB-004 | Low | `SameSite=None` session cookie widens CSRF surface | Accepted / noted |
| WEB-005 | Info | `/api/setup` key passed as URL query parameter | Noted |

---

## Finding: WEB-001 — Forgeable session tokens via default HMAC secret

**Severity:** High (CVSS 3.1 ~8.1) · **File:** `lib/session.ts`

**Description:** `secret()` returned `process.env.SESSION_SECRET || "dev-secret-change-me"`.
Session/Bearer tokens are `"<userId>.<hmac>"` signed with this key. If
`SESSION_SECRET` were ever unset in production, the signing key is a public
constant, so any attacker could mint a valid token for **any** userId — including
the `ADMIN` account — achieving full account takeover and admin access.

**Remediation (applied):** `secret()` now throws when `SESSION_SECRET` is unset
and `NODE_ENV === "production"` (fail closed — every auth attempt 500s rather than
trusting a forgeable token). Dev keeps the static key for convenience. Ensure the
Railway deployment sets a long random `SESSION_SECRET`.

---

## Finding: WEB-002 — Session tokens never expire

**Severity:** Medium · **File:** `lib/session.ts` (`createToken`)

**Description:** The Bearer token encodes only `userId` + HMAC, with no issued-at
or expiry. A leaked token (device compromise, log capture) is valid indefinitely
and cannot be revoked short of rotating `SESSION_SECRET` (which logs everyone out).

**Recommendation:** Embed an issued-at timestamp in the signed payload
(`userId.iat.hmac`) and reject tokens older than N days server-side; or store a
per-user token version that admin can bump to revoke. Requires a matching mobile
change (tokens re-minted on next sign-in).

---

## Finding: WEB-003 — No rate limiting on auth and support endpoints

**Severity:** Low · **Files:** `app/api/auth/token/route.ts`, `app/api/support/route.ts`

**Description:** `POST /api/auth/token` (signin) has no throttling, enabling
online password brute force. `POST /api/support` lets an authenticated user append
unbounded messages (spam / storage abuse), though body length is capped at 2000.

**Recommendation:** Since Railway runs a single persistent Node process, a small
in-memory sliding-window limiter (keyed by IP for auth, by userId for support) is
effective. Enforce e.g. 5 failed signins / 15 min / IP and 20 support msgs / min /
user. Password hashing already uses scrypt + constant-time compare, which blunts
offline attacks; this addresses the online vector.

---

## Finding: WEB-004 — SameSite=None session cookie

**Severity:** Low · **File:** `lib/session.ts` (`setSession`)

**Description:** The web session cookie is `SameSite=None; Secure; HttpOnly`.
`None` is required because the Telegram Mini App runs the site in a third-party
webview, but it means the cookie is sent on cross-site requests, widening the CSRF
surface for cookie-authenticated browser flows.

**Mitigations already in place:** the mobile apps authenticate with Bearer tokens
(not cookies), and admin mutations are Next.js Server Actions (framework CSRF
tokens). The exposure is limited to browser users hitting cookie-auth POST API
routes. **Recommendation:** add an origin/referer check or a CSRF token to
state-changing API routes if browser cookie auth is expanded.

---

## Finding: WEB-005 — Setup key in URL query string

**Severity:** Informational · **File:** `app/api/setup/route.ts`

**Description:** `/api/setup?key=<ADMIN_PASSWORD>` compares the key in constant
time (good), but a secret in a URL can land in proxy/access logs and browser
history. Low risk (one-time bootstrap, idempotent, never mutates a populated DB).
**Recommendation:** accept the key via an `Authorization` header instead, or rotate
`ADMIN_PASSWORD` after initial setup.

---

## Controls verified as sound (no action needed)

- **Server-side price integrity** — `POST /api/orders` recomputes every line
  price, subtotal, delivery fee and courier payout from the DB; the client basket
  is treated as a shopping list only. No price/quantity tampering.
- **Access control on driver actions** — `POST /api/driver/orders/[id]` and
  `POST /api/orders/[id]/track` verify `order.driverId === driver.id` (403 on
  mismatch), and enforce a state-machine of allowed transitions. No IDOR.
- **Guest-checkout takeover guard** — `POST /api/orders` never issues a session
  for a phone that maps to a password-bearing or elevated-role account.
- **Password storage** — scrypt with per-user salt, verified with `timingSafeEqual`.
- **Admin gating** — `requireAdmin()` guards every `/admin` page + server action;
  the `/admin` layout re-checks (defense in depth).
- **Data minimization** — the public `GET /api/orders/[id]/track` (shareable-link
  model) withholds `costPrice` and line items.
- **New endpoints** (`/api/driver/apply|me|earnings`, `/api/support`) all require a
  session and scope every query to the caller's own `userId` / `driverId`.
