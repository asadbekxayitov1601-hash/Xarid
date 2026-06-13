# Cloudflare DNS for xarid.uz (Agent 3)

DNS cannot be set from code — this is a dashboard + registrar procedure. Follow
it top to bottom. It points `xarid.uz` (and `www.xarid.uz`) at the Vercel
deployment through Cloudflare, with the right SSL mode so nothing serves a cert
warning or a redirect loop.

> `.uz` registry note: Uzbekistan domains are managed through the local
> registrar (e.g. ahost.uz / the registrar you bought `xarid.uz` from). You set
> Cloudflare's nameservers at that registrar's control panel — Cloudflare does
> not register `.uz` itself, it only provides DNS + proxy.

---

## 0. Decide the hosting target first

This doc assumes the Next.js app is deployed on **Vercel** (the project's
`vercel.json` + Next config point there). Railway is only the DB/back-office in
this stack, so the public site records point at Vercel. If you later move the
web app to Railway, swap the record *values* in §3 for Railway's target (Railway
gives you a `CNAME` target like `<service>.up.railway.app`); everything else in
this doc is identical.

---

## 1. Add the site to Cloudflare

1. Sign in at **dash.cloudflare.com** → **Add a site** → enter `xarid.uz`.
2. Pick the **Free** plan (sufficient for this app).
3. Cloudflare scans existing DNS records. Review the import — delete any stale
   parking/registrar records you don't recognize. Keep MX/email records if the
   domain receives mail.
4. Cloudflare shows **two assigned nameservers**, e.g.
   `xxxx.ns.cloudflare.com` and `yyyy.ns.cloudflare.com`. Copy both.

---

## 2. Point the registrar's nameservers at Cloudflare

1. Log in to the **registrar** where `xarid.uz` is registered (the `.uz`
   registrar control panel — NOT Cloudflare).
2. Find **Nameservers / DNS** for `xarid.uz`. Replace the existing nameservers
   with the **two Cloudflare nameservers** from §1.4. Remove all others.
3. Save. Propagation is usually minutes but can take up to 24–48h for `.uz`.
4. Back in Cloudflare, the site flips to **Active** once it detects the change
   (you'll get an email). Do the DNS records in §3 now — they're stored
   regardless of activation state.

---

## 3. DNS records (apex + www → Vercel)

In Cloudflare → **DNS → Records**, create exactly these. Get the exact target
values from **Vercel → Project → Settings → Domains** after you add both
`xarid.uz` and `www.xarid.uz` there (Vercel shows the precise A IP and CNAME).

| Type | Name | Value | Proxy | TTL |
|---|---|---|---|---|
| `A` | `@` (xarid.uz) | `76.76.21.21` (Vercel apex IP — confirm in Vercel Domains) | see §4 | Auto |
| `CNAME` | `www` | `cname.vercel-dns.com` (Vercel shows the exact target) | see §4 | Auto |

Notes:
- **Apex (`@`)** must be an `A` record (CNAME-at-apex is flattened by Cloudflare,
  but use the `A` IP Vercel hands you to avoid ambiguity). Vercel currently uses
  `76.76.21.21` for apex — **always confirm the live value in Vercel's Domains
  panel**, it can change.
- **`www`** is a `CNAME` to Vercel's `cname.vercel-dns.com`.
- Add both `xarid.uz` and `www.xarid.uz` in the Vercel project. Pick one as
  primary in Vercel (recommended: redirect `www` → apex, or apex → `www` —
  whichever you set as `NEXT_PUBLIC_APP_URL` in §6). Vercel issues its own TLS
  cert for both once DNS resolves.

### www handling

Choose ONE canonical host and 301 the other to it:
- In **Vercel → Domains**, set the redirect (e.g. `www.xarid.uz` → `xarid.uz`).
- Keep both DNS records present so the redirect source resolves.

---

## 4. Proxy (orange vs. grey cloud) + SSL/TLS

This is the part that most often causes cert errors with Vercel.

**Recommended for Vercel: set both records to "DNS only" (grey cloud).**
- Vercel terminates TLS and runs its own CDN. Proxying through Cloudflare's
  orange cloud on top of Vercel double-CDNs and frequently triggers
  `Error 1014 / cert` issues unless you configure Cloudflare for Vercel exactly.
- Grey cloud = Cloudflare only does authoritative DNS; traffic goes straight to
  Vercel. This is the simplest correct setup.

**If you specifically want Cloudflare proxy (orange cloud)** — e.g. for
Cloudflare WAF/caching in front of Vercel:
- Set **SSL/TLS → Overview → Full (strict)**. Never use "Flexible" (it causes
  redirect loops because Vercel always forces HTTPS).
- Make sure Vercel's cert is valid first (grey-cloud, confirm site loads over
  HTTPS), *then* flip to orange. Full (strict) requires a valid cert on the
  origin (Vercel provides one).
- Turn **off** Cloudflare's "Automatic HTTPS Rewrites" only if it conflicts; it's
  usually fine.

**SSL/TLS mode (either way): Full (strict).** Path: Cloudflare → **SSL/TLS →
Overview → Full (strict)**. With grey cloud this setting is moot for proxied
traffic but harmless; set it now so a later orange-cloud flip is safe.

**Always Use HTTPS:** Cloudflare → **SSL/TLS → Edge Certificates → Always Use
HTTPS = On**. (Vercel also forces HTTPS, so this is belt-and-suspenders.)

**Caching/proxy guidance (only if orange-cloud):**
- Cloudflare → **Caching → Configuration**: leave default. Next.js sets its own
  cache headers; don't add an aggressive "Cache Everything" page rule on `/` or
  `/api/*` — it would cache personalized/auth pages.
- If you proxy, add a **cache bypass** rule for `/api/*` and any authenticated
  route so session cookies and API responses are never cached at the edge.

---

## 5. Verification checklist

Run after nameservers go Active (give it time to propagate).

```bash
# Nameservers now point to Cloudflare:
dig NS xarid.uz +short
nslookup -type=ns xarid.uz          # Windows

# Apex resolves to the Vercel A record:
dig A xarid.uz +short
nslookup xarid.uz

# www resolves via the CNAME:
dig CNAME www.xarid.uz +short
nslookup www.xarid.uz

# HTTPS serves a valid cert and the app responds (follow redirects):
curl -sSI https://xarid.uz | findstr /I "HTTP location"      # Windows
curl -sSI https://www.xarid.uz | findstr /I "HTTP location"
```

Expect:
- `NS` → the two `*.ns.cloudflare.com` names.
- `A xarid.uz` → the Vercel apex IP from §3.
- `CNAME www` → `cname.vercel-dns.com`.
- `https://xarid.uz` → `200` (or a `301` to your canonical host, then `200`),
  valid TLS cert, no warning.
- The non-canonical host 301-redirects to the canonical one.

Browser sanity: open `https://xarid.uz` and `https://www.xarid.uz` — both load
the app, padlock is valid, no mixed-content or cert warning.

---

## 6. Point the app at the domain

After the domain serves the app over HTTPS:

1. **`NEXT_PUBLIC_APP_URL`** (used in Telegram `web_app` buttons and absolute
   links — see `.env.example`): set to your **canonical** host with `https://`
   and **no trailing slash**, e.g.
   ```
   NEXT_PUBLIC_APP_URL="https://xarid.uz"
   ```
   Set it in Vercel → Project → Settings → Environment Variables (Production),
   then redeploy. Must match the host you chose as canonical in §3 (`www` vs
   apex) so the Telegram bot's web-app URL and the live host agree.
2. **Telegram bot domain** (BotFather → `/setdomain`): set to the same canonical
   host so the Mini App webview opens on `xarid.uz`.
3. **CORS / FRONTEND_URL** (if the back-office on Railway has a CORS allowlist):
   add the canonical host.

---

## 7. Clerk interaction (only if Clerk is enabled — see docs/CLERK_AUTH.md)

Clerk is env-gated and off by default. If/when you enable it:

- In **dashboard.clerk.com → your app → Domains** (Production instance), add the
  canonical host `xarid.uz` (and `www.xarid.uz` if you serve both) to Clerk's
  **allowed domains**. Clerk's hosted components refuse to load on origins it
  doesn't recognize.
- Clerk's production instance issues its own **CNAME records** for its frontend
  API and accounts portal (e.g. `clerk.xarid.uz`, `accounts.xarid.uz`,
  `clkmail.xarid.uz`). Add those CNAMEs in Cloudflare exactly as Clerk's
  dashboard specifies, and set them to **DNS only (grey cloud)** — proxying
  Clerk's records through Cloudflare's orange cloud breaks its cert issuance.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` stay as the
  in-app routes (`/sign-in`, `/sign-up`) — they are paths on `xarid.uz`, not
  separate DNS records.

If Clerk is **not** enabled, ignore this section entirely; none of these records
are needed and the site works on the §3 records alone.
