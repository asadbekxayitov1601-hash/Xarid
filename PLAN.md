# Xarid — Driver App + Support + QA + Pentest build plan

> Resumable plan. Each milestone ends in a green commit. If a Claude session pauses
> (Pro limit), reopen and say **"continue"** — work resumes from the last commit.
> Branch: `feat/driver-app-and-support`.

## Goal (from user)
1. Polish/improve all mobile functions; ship a professional, working app.
2. Two separate apps: **customer** + **driver** (already split via Flutter flavors — keep).
3. **Driver app = map-first (Yandex-driver style) + profile** (order history + balance) only.
4. Driver **application form** at onboarding: full name, work experience, car type, car number.
5. **In-app support chat** in both apps.
6. Review for bugs + fix.
7. Pentest the backend with the cybersecurity skill.

## Constraints (from CLAUDE.md)
- Every user string in `lib/i18n.ts` for **uz / ru / en**. ASCII-only identifiers.
- `NODE_ENV=production npx next build` green (no Clerk keys) + `tsc --noEmit` clean before commit.
- Schema changes additive + nullable only (`db push` safe). No new payment gateways. No Clerk.
- Flutter: `flutter analyze` clean.

## Milestones
- [ ] **M1 — Backend: driver applications + balance**
  - Schema: `Driver.experienceYears?`, `Driver.carType?`, `Driver.carNumber?`, `Driver.status @default("APPROVED")` (PENDING|APPROVED|REJECTED).
  - `POST /api/driver/apply` (Bearer) — create/update PENDING Driver linked to user.
  - `GET /api/driver/me` (Bearer) — application status + profile for the app gate.
  - `GET /api/driver/earnings` (Bearer) — balance (sum courierPayout of DELIVERED) + history.
  - Admin: approve/reject in `app/admin/drivers`.
- [ ] **M2 — Backend: support chat**
  - Schema: `SupportMessage { id, userId, fromSupport, body, createdAt, readAt? }`.
  - `GET/POST /api/support` (Bearer) — user thread; admin reply path.
  - Admin support inbox page.
- [ ] **M3 — Driver app restructure (map + profile)**
  - Bottom nav: **Map**, **Profile**. Map = live self-location, online toggle, assigned jobs as
    pins/cards; tap -> existing job actions (start/delivered/call/navigate).
  - Application + "pending review" gate screens when not yet an approved driver.
  - Profile = balance card + delivered-order history.
- [ ] **M4 — Customer polish + support UI (both apps)**
  - Support chat screen wired into customer Account + driver Profile.
  - Function polish pass (error/empty/loading states, retries).
- [ ] **M5 — QA**: `flutter analyze`, `next build`, `tsc --noEmit`, fix all findings.
- [ ] **M6 — Pentest**: cybersecurity skill static review of API + auth; fix high/criticals.

## Decisions / assumptions
- "Two separate apps" = keep the existing flavor split (one Dart codebase, two app IDs). Not two repos.
- "Only map + profile" = driver bottom nav has exactly those two tabs; job actions live inside the
  map flow (a map with no way to act on a delivery would be useless).
- Balance is computed from `Order.courierPayout` of DELIVERED jobs (no money-moving features).
- Driver applications need admin approval before the account can take jobs.
